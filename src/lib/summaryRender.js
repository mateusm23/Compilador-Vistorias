// Desenha a página de resumo executivo do PDF: ranking das unidades com mais
// não conformidades e não conformidades por categoria (barras), espelhando
// os mesmos dados da planilha Excel.

import { PageSizes, rgb } from 'pdf-lib';
import { hexToFraction } from './farol.js';

function c(hex) {
  const { r, g, b } = hexToFraction(hex.replace('#', ''));
  return rgb(r, g, b);
}

const NAVY = c('1A2B45');
const BLUE = c('1A6EE8');
const WHITE = c('FFFFFF');
const INK = c('0B0B0B');
const MUTED = c('898781');
const PAGE_BG = c('F4F4F2');
const BORDER_LIGHT = c('E0E0DF');
const SHADOW = c('D9D9D8');

function drawHeader(page, pageW, pageH, title, subtitle, font, fontBold) {
  page.drawRectangle({ x: 0, y: 0, width: pageW, height: pageH, color: PAGE_BG });
  const headerH = 74;
  page.drawRectangle({ x: 0, y: pageH - headerH, width: pageW, height: headerH, color: NAVY });
  page.drawRectangle({ x: 0, y: pageH - headerH - 3, width: pageW, height: 3, color: BLUE });
  page.drawText(title, { x: 40, y: pageH - 34, size: 20, font: fontBold, color: WHITE });
  page.drawText(subtitle, { x: 40, y: pageH - 53, size: 10.5, font, color: c('CFE0F5') });
  return headerH;
}

/**
 * Insere uma página de resumo executivo em mergedDoc, no índice indicado.
 * Retorna o número de páginas inseridas (sempre 1, ou 0 se não houver dados).
 */
export function drawSummaryPage(mergedDoc, { unitCounts = {}, categoryCounts = [], totalNaoConformidades }, fonts, insertAtIndex) {
  const topUnidades = Object.entries(unitCounts)
    .map(([unidade, count]) => ({ unidade, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  if (topUnidades.length === 0 && categoryCounts.length === 0) return 0;

  const { regular: font, bold: fontBold } = fonts;
  const [pageW, pageH] = PageSizes.A4.slice().reverse();
  const page = mergedDoc.insertPage(insertAtIndex, [pageW, pageH]);
  const headerH = drawHeader(page, pageW, pageH, 'Resumo Executivo', 'Unidades com mais não conformidades e distribuição por categoria', font, fontBold);

  const cardMargin = 32;
  const cardTop = pageH - headerH - 16;
  const cardBottom = 54;
  const colGap = 20;
  const leftW = (pageW - cardMargin * 2 - colGap) * 0.38;
  const rightW = (pageW - cardMargin * 2 - colGap) * 0.62;
  const cardH = cardTop - cardBottom;

  // ---- cartão esquerdo: top 10 unidades com mais não conformidades ----
  const leftX = cardMargin;
  page.drawRectangle({ x: leftX + 2, y: cardBottom - 2, width: leftW, height: cardH, color: SHADOW, opacity: 0.5 });
  page.drawRectangle({ x: leftX, y: cardBottom, width: leftW, height: cardH, color: WHITE, borderColor: BORDER_LIGHT, borderWidth: 1 });
  page.drawText('Top 10 unidades', { x: leftX + 20, y: cardTop - 30, size: 13, font: fontBold, color: INK });
  page.drawText('Mais não conformidades identificadas', { x: leftX + 20, y: cardTop - 44, size: 8.5, font, color: MUTED });

  const unitBarAreaX = leftX + 20;
  const unitBarAreaW = leftW - 40;
  const unitLabelW = 48;
  const unitMaxW = unitBarAreaW - unitLabelW - 34;
  const unitMaxVal = Math.max(1, ...topUnidades.map(u => u.count));
  let unitBarY = cardTop - 74;
  const unitBarH = 13;
  const unitBarGap = (cardH - 100) / Math.max(1, topUnidades.length);

  topUnidades.forEach(item => {
    const w = (item.count / unitMaxVal) * unitMaxW;
    page.drawText(item.unidade, { x: unitBarAreaX, y: unitBarY, size: 8.5, font: fontBold, color: INK, maxWidth: unitLabelW });
    page.drawRectangle({ x: unitBarAreaX + unitLabelW, y: unitBarY - 3, width: unitMaxW, height: unitBarH, color: PAGE_BG });
    page.drawRectangle({ x: unitBarAreaX + unitLabelW, y: unitBarY - 3, width: w, height: unitBarH, color: BLUE });
    page.drawText(String(item.count), { x: unitBarAreaX + unitLabelW + w + 6, y: unitBarY, size: 8.5, font: fontBold, color: INK });
    unitBarY -= unitBarGap;
  });

  // ---- cartão direito: barras por categoria ----
  const rightX = leftX + leftW + colGap;
  page.drawRectangle({ x: rightX + 2, y: cardBottom - 2, width: rightW, height: cardH, color: SHADOW, opacity: 0.5 });
  page.drawRectangle({ x: rightX, y: cardBottom, width: rightW, height: cardH, color: WHITE, borderColor: BORDER_LIGHT, borderWidth: 1 });
  page.drawText('Não conformidades por categoria', { x: rightX + 20, y: cardTop - 30, size: 13, font: fontBold, color: INK });

  const top = categoryCounts.slice(0, 8);
  const maxVal = Math.max(1, ...top.map(c => c.count));
  const barAreaX = rightX + 20;
  const barAreaW = rightW - 40;
  const labelW = barAreaW * 0.42;
  const barMaxW = barAreaW - labelW - 50;
  let barY = cardTop - 56;
  const barH = 14;
  const barGap = (cardH - 100) / Math.max(1, top.length);

  top.forEach(item => {
    const w = (item.count / maxVal) * barMaxW;
    page.drawText(item.categoria, {
      x: barAreaX, y: barY, size: 8.5, font, color: INK,
      maxWidth: labelW,
    });
    page.drawRectangle({ x: barAreaX + labelW, y: barY - 3, width: barMaxW, height: barH, color: PAGE_BG });
    page.drawRectangle({ x: barAreaX + labelW, y: barY - 3, width: w, height: barH, color: BLUE });
    page.drawText(String(item.count), { x: barAreaX + labelW + w + 6, y: barY, size: 8.5, font: fontBold, color: INK });
    barY -= barGap;
  });

  page.drawText(`${totalNaoConformidades} não conformidades identificadas ao todo`, {
    x: 40, y: 26, size: 8.5, font, color: MUTED,
  });

  return 1;
}
