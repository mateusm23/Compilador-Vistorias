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
  const BLUE_DARK = rgb(0.094, 0.310, 0.584);
  const BLUE_LIGHT = rgb(0.80, 0.89, 0.98);
  const BLUE_PALE = rgb(0.91, 0.95, 0.99);
  const INK = rgb(0.043, 0.043, 0.043);
  const MUTED = rgb(0.54, 0.53, 0.51);
  const WHITE = rgb(1, 1, 1);
  const PAGE_BG = rgb(0.957, 0.957, 0.949);
  const SHADOW = rgb(0.85, 0.85, 0.84);
  const STRIPE = rgb(0.965, 0.97, 0.985);

  // ---- fundo da página ----
  mapPage.drawRectangle({ x: 0, y: 0, width: pageW, height: pageH, color: PAGE_BG });

  // ---- faixa de cabeçalho ----
  const headerH = 74;
  mapPage.drawRectangle({ x: 0, y: pageH - headerH, width: pageW, height: headerH, color: BLUE });
  mapPage.drawRectangle({ x: 0, y: pageH - headerH - 3, width: pageW, height: 3, color: BLUE_DARK });

  mapPage.drawText('Mapa de Unidades', {
    x: 40, y: pageH - 34, size: 20, font: fontBold, color: WHITE,
  });
  mapPage.drawText('Clique numa unidade para abrir o laudo correspondente', {
    x: 40, y: pageH - 53, size: 10.5, font, color: BLUE_LIGHT,
  });

  const totalUnidades = targets.length;
  const geradoEm = new Date().toLocaleDateString('pt-BR');
  const metaText = `${totalUnidades} unidade${totalUnidades === 1 ? '' : 's'} · gerado em ${geradoEm}`;
  const metaWidth = fontBold.widthOfTextAtSize(metaText, 10);
  mapPage.drawText(metaText, {
    x: pageW - 40 - metaWidth, y: pageH - 40, size: 10, font: fontBold, color: WHITE,
  });

  // ---- cartão de conteúdo (com sombra sutil) ----
  const cardMargin = 32;
  const cardTop = pageH - headerH - 16;
  const cardBottom = 54;
  const cardX = cardMargin;
  const cardW = pageW - cardMargin * 2;
  const cardH = cardTop - cardBottom;

  mapPage.drawRectangle({ x: cardX + 2, y: cardBottom - 2, width: cardW, height: cardH, color: SHADOW, opacity: 0.5 });
  mapPage.drawRectangle({
    x: cardX, y: cardBottom, width: cardW, height: cardH,
    color: WHITE, borderColor: rgb(0.88, 0.88, 0.87), borderWidth: 1,
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

  const innerPad = 18;
  const marginX = cardX + innerPad;
  const gridTop = cardTop - 34;
  const gridBottom = cardBottom + (naoReconhecidas.length > 0 ? 54 : innerPad);

  if (parsed.length > 0) {
    const pavimentos = [...new Set(parsed.map(p => p.pav))].sort((a, b) => b - a);
    const cols = 8; // A1-4, gap, B1-4 (gap tratado como coluna estreita)
    const gapColWidth = 14;
    const labelColWidth = 24;
    const gridWidth = (cardX + cardW - innerPad) - marginX - labelColWidth;
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

    // faixa de cabeçalho da grade (labels de lado)
    const ladoALabelX = marginX + labelColWidth;
    const ladoBLabelX = marginX + labelColWidth + 4 * cellWidth + gapColWidth;
    const pillY = gridTop + 10;
    [
      { x: ladoALabelX, text: 'LADO A' },
      { x: ladoBLabelX, text: 'LADO B' },
    ].forEach(({ x, text }) => {
      const w = fontBold.widthOfTextAtSize(text, 8) + 14;
      mapPage.drawRectangle({ x, y: pillY, width: w, height: 15, color: BLUE_PALE });
      mapPage.drawText(text, { x: x + 7, y: pillY + 4.5, size: 8, font: fontBold, color: BLUE_DARK });
    });

    pavimentos.forEach((pav, rowIdx) => {
      const y = gridTop - rowIdx * (cellHeight + rowGap) - cellHeight;
      if (y < gridBottom) return; // segurança: não desenhar fora da página

      if (rowIdx % 2 === 1) {
        mapPage.drawRectangle({
          x: marginX, y: y - 1, width: labelColWidth + gridWidth, height: cellHeight + 2,
          color: STRIPE,
        });
      }

      mapPage.drawText(String(pav), {
        x: marginX + labelColWidth - 6 - font.widthOfTextAtSize(String(pav), 8), y: y + cellHeight / 2 - 3, size: 8, font, color: MUTED,
      });

      let colIdx = 0;
      ['A', 'B'].forEach(lado => {
        for (let n = 1; n <= 4; n++) {
          const key = `${pav}|${lado}|${n}`;
          const unit = byPavLadoNum[key];
          const extraGap = lado === 'B' ? gapColWidth : 0;
          const x = marginX + labelColWidth + colIdx * cellWidth + extraGap;

          if (unit) {
            mapPage.drawRectangle({
              x, y, width: cellWidth - 2, height: cellHeight,
              color: BLUE_LIGHT, borderColor: BLUE, borderWidth: 0.75,
            });
            mapPage.drawRectangle({
              x, y, width: cellWidth - 2, height: 1.5, color: BLUE,
            });
            const label = unit.code;
            const size = cellHeight > 13 ? 6.5 : 5.5;
            mapPage.drawText(label, {
              x: x + 4, y: y + cellHeight / 2 - size / 2 - 1, size, font: fontBold, color: BLUE_DARK,
            });
            addLinkAnnotation(mergedDoc, mapPage, { x, y, width: cellWidth - 2, height: cellHeight }, unit.page);
          }
          colIdx++;
        }
      });
    });
  }

  // unidades cujo nome de arquivo não segue o padrão pavimento/lado — lista simples de links
  if (naoReconhecidas.length > 0) {
    const y0 = cardBottom + innerPad + 30;
    mapPage.drawText('Outras unidades', { x: marginX, y: y0 + 12, size: 9, font: fontBold, color: MUTED });
    const colWidth = 130;
    let col = 0;
    naoReconhecidas.forEach((t, i) => {
      const cx = marginX + col * colWidth;
      const cy = y0 - Math.floor(i / 6) * 12;
      mapPage.drawText(t.unidade, { x: cx, y: cy, size: 8, font, color: BLUE });
      addLinkAnnotation(mergedDoc, mapPage, { x: cx - 2, y: cy - 2, width: colWidth - 6, height: 11 }, t.page);
      col = (col + 1) % 6;
    });
  }

  // ---- rodapé ----
  mapPage.drawText('Gerado por Extrator de Vistorias', {
    x: 40, y: 26, size: 8.5, font, color: MUTED,
  });
  const pageCountText = `${mergedDoc.getPageCount()} páginas no total`;
  const pageCountWidth = font.widthOfTextAtSize(pageCountText, 8.5);
  mapPage.drawText(pageCountText, {
    x: pageW - 40 - pageCountWidth, y: 26, size: 8.5, font, color: MUTED,
  });

  // botão "Voltar ao mapa" no topo de todas as demais páginas
  const allPages = mergedDoc.getPages();
  for (let i = 1; i < allPages.length; i++) {
    const p = allPages[i];
    const { width, height } = p.getSize();
    const btnW = 100, btnH = 17;
    const bx = width - btnW - 10;
    const by = height - btnH - 8;
    p.drawRectangle({
      x: bx + 1, y: by - 1, width: btnW, height: btnH, color: SHADOW, opacity: 0.6,
    });
    p.drawRectangle({
      x: bx, y: by, width: btnW, height: btnH, color: BLUE,
    });
    p.drawText('<< Voltar ao mapa', { x: bx + 8, y: by + 5, size: 7.5, font: fontBold, color: WHITE });
    addLinkAnnotation(mergedDoc, p, { x: bx, y: by, width: btnW, height: btnH }, mapPage);
  }

  return updatedOffsets;
}
