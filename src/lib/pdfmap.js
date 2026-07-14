// Adiciona ao PDF consolidado: uma página-mapa clicável (página 1) e um botão
// "Voltar ao mapa" fixo no topo de todas as demais páginas — tudo com hyperlinks
// internos reais (funciona em qualquer leitor de PDF, sem precisar de navegador).

import { PageSizes, rgb, StandardFonts, PDFName } from 'pdf-lib';

function normalizeCode(u) {
  return u.replace(/\s+/g, '').toUpperCase();
}

// Código no padrão "<pavimento><02><A|B>", ex: 1002A, 301B
function parseUnitCode(code) {
  const m = code.match(/^(\d+)([AB])$/i);
  if (!m) return null;
  const digits = m[1];
  const lado = m[2].toUpperCase();
  if (digits.length < 3) return null;
  const num = digits.slice(-2);
  const pav = digits.slice(0, -2);
  return { pav: parseInt(pav, 10), num: parseInt(num, 10), lado, pavStr: pav };
}

function addLinkAnnotation(doc, page, rect, targetPage) {
  const annotDict = doc.context.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: [rect.x, rect.y, rect.x + rect.width, rect.y + rect.height],
    Border: [0, 0, 0],
    C: [],
    Dest: [targetPage.ref, PDFName.of('Fit')],
  });
  const annotRef = doc.context.register(annotDict);
  const existing = page.node.Annots();
  if (existing) {
    existing.push(annotRef);
  } else {
    page.node.set(PDFName.of('Annots'), doc.context.obj([annotRef]));
  }
}

/**
 * mergedDoc: PDFDocument já com todas as páginas dos laudos individuais mescladas
 * offsets: [{ unidade, filename, startPage, pageCount }] — startPage 1-indexado, ANTES da inserção do mapa
 *
 * Retorna: offsets atualizados (startPage +1, já contando a nova página-mapa)
 */
export async function addNavigation(mergedDoc, offsets) {
  const font = await mergedDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await mergedDoc.embedFont(StandardFonts.HelveticaBold);

  // referências às páginas de destino ANTES de inserir a página-mapa
  const targets = offsets.map(o => ({ ...o, page: mergedDoc.getPage(o.startPage - 1) }));

  const [pageW, pageH] = PageSizes.A4.slice().reverse(); // landscape
  const mapPage = mergedDoc.insertPage(0, [pageW, pageH]);

  // depois de inserir, toda página original desloca +1
  const updatedOffsets = offsets.map(o => ({ ...o, startPage: o.startPage + 1 }));

  const BLUE = rgb(0.165, 0.471, 0.839);
  const BLUE_LIGHT = rgb(0.80, 0.89, 0.98);
  const INK = rgb(0.043, 0.043, 0.043);
  const MUTED = rgb(0.54, 0.53, 0.51);
  const WHITE = rgb(1, 1, 1);

  // título
  mapPage.drawText('Mapa de Unidades — Laudos de Vistoria', {
    x: 40, y: pageH - 44, size: 17, font: fontBold, color: INK,
  });
  mapPage.drawText('Clique numa unidade para abrir o laudo correspondente.', {
    x: 40, y: pageH - 62, size: 10.5, font, color: MUTED,
  });

  // agrupar unidades reconhecíveis (padrão pavimento+numero+lado) e as demais
  const parsed = [];
  const naoReconhecidas = [];
  targets.forEach(t => {
    const code = normalizeCode(t.unidade);
    const p = parseUnitCode(code);
    if (p) parsed.push({ ...t, ...p, code });
    else naoReconhecidas.push(t);
  });

  const marginX = 40;
  const gridTop = pageH - 90;
  const gridBottom = 40;

  if (parsed.length > 0) {
    const pavimentos = [...new Set(parsed.map(p => p.pav))].sort((a, b) => b - a);
    const cols = 8; // A1-4, gap, B1-4 (gap tratado como coluna estreita)
    const gapColWidth = 10;
    const gridWidth = pageW - marginX * 2;
    const cellWidth = (gridWidth - gapColWidth) / cols;
    const rowCount = pavimentos.length;
    const availableHeight = gridTop - gridBottom;
    const cellHeight = Math.max(9, Math.min(22, availableHeight / rowCount - 3));
    const rowGap = 3;

    const byPavLadoNum = {};
    parsed.forEach(p => {
      const key = `${p.pav}|${p.lado}|${p.num}`;
      byPavLadoNum[key] = p;
    });

    pavimentos.forEach((pav, rowIdx) => {
      const y = gridTop - rowIdx * (cellHeight + rowGap) - cellHeight;
      if (y < gridBottom) return; // segurança: não desenhar fora da página

      mapPage.drawText(String(pav), {
        x: marginX - 2, y: y + cellHeight / 2 - 3, size: 8, font, color: MUTED,
      });

      let colIdx = 0;
      ['A', 'B'].forEach(lado => {
        for (let n = 1; n <= 4; n++) {
          const key = `${pav}|${lado}|${n}`;
          const unit = byPavLadoNum[key];
          const extraGap = lado === 'B' ? gapColWidth : 0;
          const x = marginX + 26 + colIdx * cellWidth + extraGap;

          if (unit) {
            mapPage.drawRectangle({
              x, y, width: cellWidth - 2, height: cellHeight,
              color: BLUE_LIGHT, borderColor: BLUE, borderWidth: 0.75,
            });
            const label = unit.code;
            const size = cellHeight > 13 ? 6.5 : 5.5;
            mapPage.drawText(label, {
              x: x + 3, y: y + cellHeight / 2 - size / 2 - 1, size, font, color: INK,
            });
            addLinkAnnotation(mergedDoc, mapPage, { x, y, width: cellWidth - 2, height: cellHeight }, unit.page);
          }
          colIdx++;
        }
      });
    });

    // legenda de lado
    mapPage.drawText('LADO A', { x: marginX + 26, y: gridTop + 8, size: 8, font: fontBold, color: MUTED });
    mapPage.drawText('LADO B', { x: marginX + 26 + 4 * cellWidth + gapColWidth, y: gridTop + 8, size: 8, font: fontBold, color: MUTED });
  }

  // unidades cujo nome de arquivo não segue o padrão pavimento/lado — lista simples de links
  if (naoReconhecidas.length > 0) {
    let x = marginX;
    let y = parsed.length > 0 ? gridBottom - 14 : gridTop;
    if (y < 30) y = 30;
    mapPage.drawText('Outras unidades:', { x, y: y + 12, size: 9, font: fontBold, color: MUTED });
    const colWidth = 130;
    let col = 0;
    naoReconhecidas.forEach((t, i) => {
      const cx = x + col * colWidth;
      const cy = y - Math.floor(i / 6) * 12;
      mapPage.drawText(t.unidade, { x: cx, y: cy, size: 8, font, color: BLUE });
      addLinkAnnotation(mergedDoc, mapPage, { x: cx - 2, y: cy - 2, width: colWidth - 6, height: 11 }, t.page);
      col = (col + 1) % 6;
    });
  }

  // botão "Voltar ao mapa" no topo de todas as demais páginas
  const allPages = mergedDoc.getPages();
  for (let i = 1; i < allPages.length; i++) {
    const p = allPages[i];
    const { width, height } = p.getSize();
    const btnW = 96, btnH = 16;
    const bx = width - btnW - 10;
    const by = height - btnH - 8;
    p.drawRectangle({
      x: bx, y: by, width: btnW, height: btnH,
      color: WHITE, borderColor: BLUE, borderWidth: 0.75, opacity: 0.92,
    });
    p.drawText('<< Voltar ao mapa', { x: bx + 6, y: by + 4.5, size: 7.5, font: fontBold, color: BLUE });
    addLinkAnnotation(mergedDoc, p, { x: bx, y: by, width: btnW, height: btnH }, mapPage);
  }

  return updatedOffsets;
}
