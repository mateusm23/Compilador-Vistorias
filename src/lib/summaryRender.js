// Desenha a página de resumo executivo do PDF: farol de controle (rosca) e
// não conformidades por categoria (barras), espelhando os mesmos dados da
// planilha Excel.

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

function drawPieSlice(page, cx, cy, r, startAngle, endAngle, color) {
  if (endAngle - startAngle <= 0.0001) return;
  const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;
  const x1 = r * Math.cos(startAngle), y1 = r * Math.sin(startAngle);
  const x2 = r * Math.cos(endAngle), y2 = r * Math.sin(endAngle);
  const path = `M 0 0 L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  page.drawSvgPath(path, { x: cx, y: cy, color });
}

function drawDonut(page, { cx, cy, radius, holeRadius, segments, font, fontBold }) {
  const total = Math.max(1, segments.reduce((s, seg) => s + seg.value, 0));
  let angle = -Math.PI / 2;
  segments.forEach(seg => {
    const sweep = (seg.value / total) * Math.PI * 2;
    if (seg.value > 0) drawPieSlice(page, cx, cy, radius, angle, angle + sweep, c(seg.hex));
    angle += sweep;
  });
  // furo central para o efeito "rosca"
  const holePath = `M ${-holeRadius} 0 A ${holeRadius} ${holeRadius} 0 1 1 ${holeRadius} 0 A ${holeRadius} ${holeRadius} 0 1 1 ${-holeRadius} 0 Z`;
  page.drawSvgPath(holePath, { x: cx, y: cy, color: WHITE });

  const centerText = String(total);
  const tw = fontBold.widthOfTextAtSize(centerText, 20);
  page.drawText(centerText, { x: cx - tw / 2, y: cy - 7, size: 20, font: fontBold, color: INK });
  const label = 'unidades';
  const lw = font.widthOfTextAtSize(label, 8);
  page.drawText(label, { x: cx - lw / 2, y: cy - 22, size: 8, font, color: MUTED });
}

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
export function drawSummaryPage(mergedDoc, { farolCounts, categoryCounts = [], totalNaoConformidades }, fonts, insertAtIndex) {
  const total = farolCounts.regular + farolCounts.atencao + farolCounts.critico;
  if (total === 0 && categoryCounts.length === 0) return 0;

  const { regular: font, bold: fontBold } = fonts;
  const [pageW, pageH] = PageSizes.A4.slice().reverse();
  const page = mergedDoc.insertPage(insertAtIndex, [pageW, pageH]);
  const headerH = drawHeader(page, pageW, pageH, 'Resumo Executivo', 'Farol de controle e não conformidades por categoria', font, fontBold);

  const cardMargin = 32;
  const cardTop = pageH - headerH - 16;
  const cardBottom = 54;
  const colGap = 20;
  const leftW = (pageW - cardMargin * 2 - colGap) * 0.38;
  const rightW = (pageW - cardMargin * 2 - colGap) * 0.62;
  const cardH = cardTop - cardBottom;

  // ---- cartão esquerdo: rosca do farol ----
  const leftX = cardMargin;
  page.drawRectangle({ x: leftX + 2, y: cardBottom - 2, width: leftW, height: cardH, color: SHADOW, opacity: 0.5 });
  page.drawRectangle({ x: leftX, y: cardBottom, width: leftW, height: cardH, color: WHITE, borderColor: BORDER_LIGHT, borderWidth: 1 });
  page.drawText('Farol de Controle', { x: leftX + 20, y: cardTop - 30, size: 13, font: fontBold, color: INK });

  const donutCx = leftX + leftW / 2;
  const donutCy = cardBottom + cardH / 2 + 10;
  const donutR = Math.min(leftW, cardH) * 0.28;
  drawDonut(page, {
    cx: donutCx, cy: donutCy, radius: donutR, holeRadius: donutR * 0.55,
    segments: [
      { label: 'Regular', value: farolCounts.regular, hex: '0CA30C' },
      { label: 'Atenção', value: farolCounts.atencao, hex: 'F5C800' },
      { label: 'Crítico', value: farolCounts.critico, hex: 'D03B3B' },
    ],
    font, fontBold,
  });

  const legendItems = [
    { label: 'Regular', value: farolCounts.regular, hex: '0CA30C' },
    { label: 'Atenção', value: farolCounts.atencao, hex: 'F5C800' },
    { label: 'Crítico', value: farolCounts.critico, hex: 'D03B3B' },
  ];
  let legendY = cardBottom + 34;
  legendItems.forEach(item => {
    page.drawRectangle({ x: leftX + 24, y: legendY, width: 10, height: 10, color: c(item.hex) });
    page.drawText(`${item.label}`, { x: leftX + 40, y: legendY + 1.5, size: 9.5, font, color: INK });
    const valText = String(item.value);
    const vw = fontBold.widthOfTextAtSize(valText, 9.5);
    page.drawText(valText, { x: leftX + leftW - 24 - vw, y: legendY + 1.5, size: 9.5, font: fontBold, color: INK });
    legendY -= 20;
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
