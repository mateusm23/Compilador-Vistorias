// Adiciona ao PDF consolidado: uma capa (página 1), um mapa clicável de
// unidades colorido por severidade (página 2) e um botão "Voltar ao mapa"
// fixo no topo de todas as demais páginas — tudo com hyperlinks internos
// reais (funciona em qualquer leitor de PDF, sem precisar de navegador).

import { PageSizes, rgb, StandardFonts, PDFName } from 'pdf-lib';
import { buildFarolThresholds, farolFor, hexToFraction } from './farol.js';
import { normalizeCode, parseUnitCode } from './units.js';

function c(hex) {
  const { r, g, b } = hexToFraction(hex);
  return rgb(r, g, b);
}

// luminância relativa (fórmula usada para decidir texto claro/escuro sobre uma cor)
function isLight(hex) {
  const { r, g, b } = hexToFraction(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 0.6;
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

const BLUE = c('2A78D6');
const BLUE_DARK = c('184F95');
const NAVY = c('0B1524');
const NAVY_2 = c('132038');
const WHITE = c('FFFFFF');
const INK = c('0B0B0B');
const MUTED = c('8A8985');
const PAGE_BG = c('F4F4F2');
const SHADOW = c('D9D9D8');
const STRIPE = c('F6F7FA');
const BORDER_LIGHT = c('E0E0DF');

/**
 * Desenha a página de capa (estilo "relatório executivo"): fundo escuro,
 * faixa de destaque, título, e um painel com os números-chave do lote.
 */
function drawCoverPage(page, { totalUnidades, totalNaoConformidades, farolCounts, geradoEm }) {
  const { width: w, height: h } = page.getSize();

  page.drawRectangle({ x: 0, y: 0, width: w, height: h, color: NAVY });
  // faixa diagonal decorativa (aproximada com um retângulo rotacionado)
  page.drawRectangle({
    x: w * 0.62, y: -h * 0.3, width: w * 0.55, height: h * 1.8,
    color: NAVY_2, rotate: { type: 'degrees', angle: 18 },
  });
  page.drawRectangle({ x: 0, y: 0, width: 10, height: h, color: BLUE });

  const marginX = 64;

  // "logo" / marca
  page.drawText('EXTRATOR DE VISTORIAS', {
    x: marginX, y: h - 60, size: 12, color: BLUE, opacity: 0.95,
  });
  page.drawRectangle({ x: marginX, y: h - 68, width: 34, height: 2, color: BLUE });

  // título principal
  page.drawText('Relatório Consolidado', {
    x: marginX, y: h - 150, size: 34, color: WHITE,
  });
  page.drawText('de Vistorias', {
    x: marginX, y: h - 190, size: 34, color: WHITE,
  });
  page.drawText('Laudos individuais mesclados, classificados e organizados num único documento navegável.', {
    x: marginX, y: h - 218, size: 11.5, color: c('B7C4D9'),
  });

  // painel de números-chave
  const panelY = 110;
  const panelH = 150;
  const panelW = w - marginX * 2;
  page.drawRectangle({
    x: marginX, y: panelY, width: panelW, height: panelH,
    color: c('FFFFFF'), opacity: 0.06, borderColor: c('FFFFFF'), borderOpacity: 0.14, borderWidth: 1,
  });

  const stats = [
    { label: 'Unidades no lote', value: String(totalUnidades) },
    { label: 'Não conformidades', value: String(totalNaoConformidades) },
    { label: 'Gerado em', value: geradoEm },
  ];
  const colW = panelW / stats.length;
  stats.forEach((s, i) => {
    const x = marginX + i * colW + 24;
    page.drawText(s.value, { x, y: panelY + panelH - 46, size: 26, color: WHITE });
    page.drawText(s.label.toUpperCase(), { x, y: panelY + panelH - 66, size: 8.5, color: c('8FA3C2') });
  });

  // barra de farol (distribuição de severidade)
  const barY = panelY + 28;
  const barX = marginX + 24;
  const barW = panelW - 48;
  const total = Math.max(1, farolCounts.regular + farolCounts.atencao + farolCounts.critico);
  let cursor = barX;
  const barH = 8;
  [
    { n: farolCounts.regular, hex: 'regular' },
    { n: farolCounts.atencao, hex: 'atencao' },
    { n: farolCounts.critico, hex: 'critico' },
  ].forEach(seg => {
    const segW = (seg.n / total) * barW;
    if (segW <= 0) return;
    const colorHex = seg.hex === 'regular' ? '0CA30C' : seg.hex === 'atencao' ? 'F5C800' : 'D03B3B';
    page.drawRectangle({ x: cursor, y: barY, width: segW, height: barH, color: c(colorHex) });
    cursor += segW;
  });
  page.drawText(`${farolCounts.regular} regular · ${farolCounts.atencao} atenção · ${farolCounts.critico} crítico`, {
    x: barX, y: barY - 14, size: 8.5, color: c('8FA3C2'),
  });

  // rodapé
  page.drawText('Desenvolvido por Mateus Monteiro · 62 99156-3421', {
    x: marginX, y: 34, size: 8, color: c('5E7291'),
  });
}

/**
 * mergedDoc: PDFDocument já com todas as páginas dos laudos individuais mescladas
 * offsets: [{ unidade, filename, startPage, pageCount }] — startPage 1-indexado, ANTES da inserção das páginas novas
 * meta: { unitCounts: { [unidade]: totalNaoConformidades }, totalNaoConformidades }
 *
 * Retorna: offsets atualizados (startPage já contando capa + mapa)
 */
export async function addNavigation(mergedDoc, offsets, meta = {}) {
  const { unitCounts = {}, totalNaoConformidades = 0 } = meta;
  const font = await mergedDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await mergedDoc.embedFont(StandardFonts.HelveticaBold);

  // referências às páginas de destino ANTES de qualquer inserção
  const targets = offsets.map(o => ({ ...o, page: mergedDoc.getPage(o.startPage - 1) }));

  const [pageW, pageH] = PageSizes.A4.slice().reverse(); // landscape

  // ---- página do mapa (inserida primeiro, depois empurrada para o índice 1 pela capa) ----
  const mapPage = mergedDoc.insertPage(0, [pageW, pageH]);

  mapPage.drawRectangle({ x: 0, y: 0, width: pageW, height: pageH, color: PAGE_BG });

  const headerH = 74;
  mapPage.drawRectangle({ x: 0, y: pageH - headerH, width: pageW, height: headerH, color: BLUE });
  mapPage.drawRectangle({ x: 0, y: pageH - headerH - 3, width: pageW, height: 3, color: BLUE_DARK });

  mapPage.drawText('Mapa de Unidades', { x: 40, y: pageH - 34, size: 20, font: fontBold, color: WHITE });
  mapPage.drawText('Clique numa unidade para abrir o laudo correspondente', {
    x: 40, y: pageH - 53, size: 10.5, font, color: c('CFE0F5'),
  });

  const totalUnidades = targets.length;
  const geradoEm = new Date().toLocaleDateString('pt-BR');
  const metaText = `${totalUnidades} unidade${totalUnidades === 1 ? '' : 's'} · gerado em ${geradoEm}`;
  const metaWidth = fontBold.widthOfTextAtSize(metaText, 10);
  mapPage.drawText(metaText, { x: pageW - 40 - metaWidth, y: pageH - 40, size: 10, font: fontBold, color: WHITE });

  // farol: limiares calculados sobre a distribuição real do lote
  const thresholds = buildFarolThresholds(Object.values(unitCounts));
  const farolCounts = { regular: 0, atencao: 0, critico: 0 };
  targets.forEach(t => {
    const n = unitCounts[t.unidade] || 0;
    farolCounts[farolFor(n, thresholds).key]++;
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
    color: WHITE, borderColor: BORDER_LIGHT, borderWidth: 1,
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
    const cols = 8;
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

    const ladoALabelX = marginX + labelColWidth;
    const ladoBLabelX = marginX + labelColWidth + 4 * cellWidth + gapColWidth;
    const pillY = gridTop + 10;
    [{ x: ladoALabelX, text: 'LADO A' }, { x: ladoBLabelX, text: 'LADO B' }].forEach(({ x, text }) => {
      const pw = fontBold.widthOfTextAtSize(text, 8) + 14;
      mapPage.drawRectangle({ x, y: pillY, width: pw, height: 15, color: c('E8F0FC') });
      mapPage.drawText(text, { x: x + 7, y: pillY + 4.5, size: 8, font: fontBold, color: BLUE_DARK });
    });

    // legenda de farol, alinhada à direita do cabeçalho da grade
    const legendItems = [
      { label: 'Regular', hex: '0CA30C' },
      { label: 'Atenção', hex: 'C98500' },
      { label: 'Crítico', hex: 'D03B3B' },
    ];
    let legendX = cardX + cardW - innerPad;
    for (let i = legendItems.length - 1; i >= 0; i--) {
      const item = legendItems[i];
      const tw = font.widthOfTextAtSize(item.label, 7.5);
      legendX -= tw;
      mapPage.drawText(item.label, { x: legendX, y: pillY + 4.5, size: 7.5, font, color: MUTED });
      legendX -= 12;
      mapPage.drawRectangle({ x: legendX, y: pillY + 3.5, width: 8, height: 8, color: c(item.hex) });
      legendX -= 10;
    }

    pavimentos.forEach((pav, rowIdx) => {
      const y = gridTop - rowIdx * (cellHeight + rowGap) - cellHeight;
      if (y < gridBottom) return;

      if (rowIdx % 2 === 1) {
        mapPage.drawRectangle({
          x: marginX, y: y - 1, width: labelColWidth + gridWidth, height: cellHeight + 2, color: STRIPE,
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
            const count = unitCounts[unit.unidade] || 0;
            const farol = farolFor(count, thresholds);
            const fill = c(farol.hex);
            const textColor = isLight(farol.hex) ? INK : WHITE;

            mapPage.drawRectangle({ x, y, width: cellWidth - 2, height: cellHeight, color: fill });
            const label = unit.code;
            const size = cellHeight > 13 ? 6.5 : 5.5;
            const labelWidth = fontBold.widthOfTextAtSize(label, size);
            mapPage.drawText(label, {
              x: x + (cellWidth - 2 - labelWidth) / 2, y: y + cellHeight / 2 - size / 2 - 1, size, font: fontBold, color: textColor,
            });
            addLinkAnnotation(mergedDoc, mapPage, { x, y, width: cellWidth - 2, height: cellHeight }, unit.page);
          }
          colIdx++;
        }
      });
    });
  }

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

  mapPage.drawText('Desenvolvido por Mateus Monteiro · 62 99156-3421', { x: 40, y: 26, size: 8.5, font, color: MUTED });
  const pageCountText = `${mergedDoc.getPageCount() + 1} páginas no total`;
  const pageCountWidth = font.widthOfTextAtSize(pageCountText, 8.5);
  mapPage.drawText(pageCountText, { x: pageW - 40 - pageCountWidth, y: 26, size: 8.5, font, color: MUTED });

  // ---- capa (inserida por último, empurra o mapa para o índice 1) ----
  const coverPage = mergedDoc.insertPage(0, [pageW, pageH]);
  drawCoverPage(coverPage, {
    totalUnidades,
    totalNaoConformidades,
    farolCounts,
    geradoEm,
  });
  addLinkAnnotation(mergedDoc, coverPage, { x: 0, y: 0, width: pageW, height: pageH }, mapPage);

  // depois de inserir capa + mapa, toda página original desloca +2
  const updatedOffsets = offsets.map(o => ({ ...o, startPage: o.startPage + 2 }));

  // botão "Voltar ao mapa" no topo de todas as páginas de laudo (a partir do índice 2)
  const allPages = mergedDoc.getPages();
  for (let i = 2; i < allPages.length; i++) {
    const p = allPages[i];
    const { width, height } = p.getSize();
    const btnW = 100, btnH = 17;
    const bx = width - btnW - 10;
    const by = height - btnH - 8;
    p.drawRectangle({ x: bx + 1, y: by - 1, width: btnW, height: btnH, color: SHADOW, opacity: 0.6 });
    p.drawRectangle({ x: bx, y: by, width: btnW, height: btnH, color: BLUE });
    p.drawText('<< Voltar ao mapa', { x: bx + 8, y: by + 5, size: 7.5, font: fontBold, color: WHITE });
    addLinkAnnotation(mergedDoc, p, { x: bx, y: by, width: btnW, height: btnH }, mapPage);
  }

  return updatedOffsets;
}
