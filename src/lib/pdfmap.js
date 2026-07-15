// Adiciona ao PDF consolidado: uma capa (página 1), um mapa clicável de
// unidades colorido por severidade (página 2) e um botão "Voltar ao mapa"
// fixo no topo de todas as demais páginas — tudo com hyperlinks internos
// reais (funciona em qualquer leitor de PDF, sem precisar de navegador).

import { PageSizes, rgb, StandardFonts, PDFName } from 'pdf-lib';
import { buildFarolThresholds, farolFor, hexToFraction } from './farol.js';
import { normalizeCode, parseUnitCode, buildUnitCode } from './units.js';
import { drawIntroContent } from './introRender.js';
import { drawSummaryPage } from './summaryRender.js';

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
const PETROLEUM = c('0F4C5C');
const NAVY = c('0B1524');
const NAVY_2 = c('132038');
const WHITE = c('FFFFFF');
const INK = c('0B0B0B');
const MUTED = c('8A8985');
const PAGE_BG = c('F4F4F2');
const SHADOW = c('D9D9D8');
const STRIPE = c('F6F7FA');
const BORDER_LIGHT = c('E0E0DF');

async function embedImageSmart(doc, imageData) {
  if (!imageData || !imageData.arrayBuffer || imageData.arrayBuffer.byteLength === 0) return null;
  const bytes = new Uint8Array(imageData.arrayBuffer);
  const type = (imageData.type || '').toLowerCase();
  try {
    if (type.includes('png')) return await doc.embedPng(bytes);
    return await doc.embedJpg(bytes);
  } catch (e) {
    // formato não suportado (ex: webp) — a capa segue sem a imagem
    return null;
  }
}

function fitContain(img, boxW, boxH) {
  const scale = Math.min(boxW / img.width, boxH / img.height);
  return { width: img.width * scale, height: img.height * scale };
}

/**
 * Desenha a página de capa: fundo escuro, faixa de destaque, dados do
 * relatório preenchidos pelo usuário, logo e foto da obra quando enviados.
 */
function drawCoverPage(page, {
  totalUnidades, totalNaoConformidades, farolCounts, geradoEm,
  reportData = {}, logoImage, capaPhotoImage, font, fontBold,
}) {
  const { width: w, height: h } = page.getSize();

  page.drawRectangle({ x: 0, y: 0, width: w, height: h, color: NAVY });
  // faixa diagonal decorativa (aproximada com um retângulo rotacionado)
  page.drawRectangle({
    x: w * 0.62, y: -h * 0.3, width: w * 0.55, height: h * 1.8,
    color: NAVY_2, rotate: { type: 'degrees', angle: 18 },
  });
  page.drawRectangle({ x: 0, y: 0, width: 10, height: h, color: BLUE });

  const marginX = 64;

  // logo (imagem enviada) ou marca padrão como recuo
  if (logoImage) {
    const box = fitContain(logoImage, 130, 42);
    page.drawImage(logoImage, { x: marginX, y: h - 34 - box.height, width: box.width, height: box.height });
  } else {
    page.drawText('EXTRATOR DE VISTORIAS', { x: marginX, y: h - 60, size: 12, font: fontBold, color: BLUE, opacity: 0.95 });
    page.drawRectangle({ x: marginX, y: h - 68, width: 34, height: 2, color: BLUE });
  }

  // foto da obra, no canto superior direito
  if (capaPhotoImage) {
    const boxW = 220, boxH = 130;
    const boxX = w - marginX - boxW, boxY = h - 34 - boxH;
    const fitted = fitContain(capaPhotoImage, boxW, boxH);
    page.drawRectangle({ x: boxX - 4, y: boxY - 4, width: boxW + 8, height: boxH + 8, color: WHITE, opacity: 0.08 });
    page.drawImage(capaPhotoImage, {
      x: boxX + (boxW - fitted.width) / 2, y: boxY + (boxH - fitted.height) / 2,
      width: fitted.width, height: fitted.height,
    });
  }

  // título principal
  const obraTitle = reportData.obra ? reportData.obra : 'Relatório Consolidado de Vistorias';
  page.drawText(obraTitle, { x: marginX, y: h - 150, size: obraTitle.length > 28 ? 26 : 34, font: fontBold, color: WHITE });
  page.drawText('Relatório consolidado de vistorias', {
    x: marginX, y: h - 190, size: 13, font, color: c('B7C4D9'),
  });

  // dados do relatório preenchidos pelo usuário
  const infoRows = [
    ['Responsável', reportData.responsavel],
    ['Construtora', reportData.construtora],
    ['Gerenciadora', reportData.gerenciadora],
    ['Período', [reportData.dataInicio, reportData.dataFim].filter(Boolean).join(' a ')],
  ].filter(([, value]) => value);

  infoRows.forEach(([label, value], i) => {
    const y = h - 222 - i * 16;
    page.drawText(`${label}:`, { x: marginX, y, size: 9.5, font: fontBold, color: c('8FA3C2') });
    page.drawText(String(value), { x: marginX + 84, y, size: 9.5, font, color: WHITE });
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
    page.drawText(s.value, { x, y: panelY + panelH - 46, size: 26, font: fontBold, color: WHITE });
    page.drawText(s.label.toUpperCase(), { x, y: panelY + panelH - 66, size: 8.5, font, color: c('8FA3C2') });
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
    x: barX, y: barY - 14, size: 8.5, font, color: c('8FA3C2'),
  });

  // rodapé
  page.drawText('Desenvolvido por Mateus Monteiro · 62 99156-3421', {
    x: marginX, y: 34, size: 8, font, color: c('5E7291'),
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
  const fontItalic = await mergedDoc.embedFont(StandardFonts.HelveticaOblique);
  const fontBoldItalic = await mergedDoc.embedFont(StandardFonts.HelveticaBoldOblique);
  const introFonts = { regular: font, bold: fontBold, italic: fontItalic, boldItalic: fontBoldItalic };

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

  // categorias definidas pelo usuário (com fallback para "Vistoriada" azul,
  // caso a ferramenta seja usada sem passar por essa configuração)
  const categories = meta.categories && meta.categories.length > 0
    ? meta.categories
    : [{ id: 'vistoriada', nome: 'Vistoriada', cor: '2A78D6', padrao: true }];
  const categoryById = {};
  categories.forEach(cat => { categoryById[cat.id] = cat; });
  const defaultCategory = categories.find(cat => cat.padrao) || categories[0];
  const unitCategoryOverrides = meta.unitCategoryOverrides || {};

  // mapear cada unidade com laudo para o código reconhecido (pavimento+lado+número)
  const targetByCode = {};
  const naoReconhecidas = [];
  targets.forEach(t => {
    const code = normalizeCode(t.unidade);
    const p = parseUnitCode(code);
    if (p) targetByCode[code] = t;
    else naoReconhecidas.push(t);
  });

  // estrutura do empreendimento: usa a configuração do usuário, com fallback
  // calculado a partir das unidades detectadas (compatibilidade retroativa)
  let buildingConfig = meta.buildingConfig;
  if (!buildingConfig) {
    const parsedFallback = targets
      .map(t => ({ t, p: parseUnitCode(normalizeCode(t.unidade)) }))
      .filter(x => x.p);
    if (parsedFallback.length > 0) {
      buildingConfig = {
        pavMin: Math.min(...parsedFallback.map(x => x.p.pav)),
        pavMax: Math.max(...parsedFallback.map(x => x.p.pav)),
        numMin: Math.min(...parsedFallback.map(x => x.p.num)),
        numMax: Math.max(...parsedFallback.map(x => x.p.num)),
        lados: [...new Set(parsedFallback.map(x => x.p.lado))].sort(),
      };
    }
  }

  const innerPad = 18;
  const marginX = cardX + innerPad;
  const gridTop = cardTop - 34;
  const gridBottom = cardBottom + (naoReconhecidas.length > 0 ? 54 : innerPad);

  if (buildingConfig && buildingConfig.lados.length > 0) {
    const { pavMin, pavMax, numMin, numMax, lados } = buildingConfig;
    const numCount = numMax - numMin + 1;
    const pavimentos = [];
    for (let p = pavMax; p >= pavMin; p--) pavimentos.push(p);

    const gapColWidth = 14;
    const labelColWidth = 24;
    const cols = lados.length * numCount;
    const gridWidth = (cardX + cardW - innerPad) - marginX - labelColWidth;
    const totalGaps = gapColWidth * (lados.length - 1);
    const cellWidth = (gridWidth - totalGaps) / cols;
    const rowCount = pavimentos.length;
    const availableHeight = gridTop - gridBottom;
    const cellHeight = Math.max(7, Math.min(22, availableHeight / rowCount - 3));
    const rowGap = 3;

    // rótulos de bloco, um por lado configurado
    const pillY = gridTop + 10;
    lados.forEach((lado, li) => {
      const x = marginX + labelColWidth + li * (numCount * cellWidth + gapColWidth);
      const text = `BLOCO ${lado}`;
      const pw = fontBold.widthOfTextAtSize(text, 8) + 14;
      mapPage.drawRectangle({ x, y: pillY, width: pw, height: 15, color: c('E8F0FC') });
      mapPage.drawText(text, { x: x + 7, y: pillY + 4.5, size: 8, font: fontBold, color: BLUE_DARK });
    });

    // legenda das categorias, alinhada à direita do cabeçalho da grade
    let legendX = cardX + cardW - innerPad;
    for (let i = categories.length - 1; i >= 0; i--) {
      const item = categories[i];
      const tw = font.widthOfTextAtSize(item.nome, 7.5);
      legendX -= tw;
      mapPage.drawText(item.nome, { x: legendX, y: pillY + 4.5, size: 7.5, font, color: MUTED });
      legendX -= 12;
      mapPage.drawRectangle({ x: legendX, y: pillY + 3.5, width: 8, height: 8, color: c(item.cor) });
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
      lados.forEach((lado, li) => {
        for (let n = numMin; n <= numMax; n++) {
          const code = buildUnitCode(pav, n, lado);
          const target = targetByCode[code];
          const overrideId = unitCategoryOverrides[code];
          const categoryId = overrideId || (target ? defaultCategory.id : null);
          const category = categoryId ? categoryById[categoryId] : null;
          const extraGap = li * gapColWidth;
          const x = marginX + labelColWidth + colIdx * cellWidth + extraGap;

          if (category) {
            const fill = c(category.cor);
            const textColor = isLight(category.cor) ? INK : WHITE;
            mapPage.drawRectangle({ x, y, width: cellWidth - 2, height: cellHeight, color: fill });
            const size = cellHeight > 13 ? 6.5 : 5.5;
            const labelWidth = fontBold.widthOfTextAtSize(code, size);
            mapPage.drawText(code, {
              x: x + (cellWidth - 2 - labelWidth) / 2, y: y + cellHeight / 2 - size / 2 - 1, size, font: fontBold, color: textColor,
            });
            if (target) {
              addLinkAnnotation(mergedDoc, mapPage, { x, y, width: cellWidth - 2, height: cellHeight }, target.page);
            }
          } else {
            mapPage.drawRectangle({
              x, y, width: cellWidth - 2, height: cellHeight, color: PAGE_BG, borderColor: BORDER_LIGHT, borderWidth: 0.5,
            });
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
  const [logoImage, capaPhotoImage] = await Promise.all([
    embedImageSmart(mergedDoc, meta.logo),
    embedImageSmart(mergedDoc, meta.capaPhoto),
  ]);

  const coverPage = mergedDoc.insertPage(0, [pageW, pageH]);
  drawCoverPage(coverPage, {
    totalUnidades,
    totalNaoConformidades,
    farolCounts,
    geradoEm,
    reportData: meta.reportData || {},
    logoImage,
    capaPhotoImage,
    font,
    fontBold,
  });

  // ---- introdução (inserida após capa + mapa, se houver texto) ----
  const introPageCount = await drawIntroContent(mergedDoc, meta.introContent, introFonts, 2);

  // ---- resumo executivo (farol em rosca + categorias em barra) ----
  const summaryPageCount = drawSummaryPage(mergedDoc, {
    farolCounts,
    categoryCounts: meta.categoryCounts || [],
    totalNaoConformidades,
  }, { regular: font, bold: fontBold }, 2 + introPageCount);

  // depois de inserir capa + mapa + introdução + resumo, toda página original desloca
  const totalNewPages = 2 + introPageCount + summaryPageCount;
  const updatedOffsets = offsets.map(o => ({ ...o, startPage: o.startPage + totalNewPages }));

  // cabeçalho/rodapé de marca em todas as páginas de laudo, cobrindo o
  // rodapé original do gerador do laudo (linha + "gerado por ...")
  const allPages = mergedDoc.getPages();
  const backLabel = 'Voltar ao mapa';
  const gerenciadora = (meta.reportData && meta.reportData.gerenciadora) || 'Gerenciadora Trinus';
  for (let i = totalNewPages; i < allPages.length; i++) {
    const p = allPages[i];
    const { width, height } = p.getSize();

    const footerH = 64;
    p.drawRectangle({ x: 0, y: 0, width, height: footerH, color: WHITE });
    p.drawRectangle({ x: 24, y: footerH - 1, width: width - 48, height: 0.75, color: BORDER_LIGHT });
    p.drawText(gerenciadora, { x: 24, y: 22, size: 8, font: fontBold, color: NAVY });
    const brandText = 'Extrator de Vistorias';
    const brandW = font.widthOfTextAtSize(brandText, 7.5);
    p.drawText(brandText, { x: width - 24 - brandW, y: 22, size: 7.5, font, color: MUTED });

    const labelWidth = fontBold.widthOfTextAtSize(backLabel, 8);
    const btnW = labelWidth + 24, btnH = 18;
    const bx = width - btnW - 10;
    const by = height - btnH - 8;
    p.drawRectangle({ x: bx + 1, y: by - 1, width: btnW, height: btnH, color: SHADOW, opacity: 0.6 });
    p.drawRectangle({ x: bx, y: by, width: btnW, height: btnH, color: PETROLEUM });
    p.drawText(backLabel, { x: bx + 12, y: by + 5.5, size: 8, font: fontBold, color: WHITE });
    addLinkAnnotation(mergedDoc, p, { x: bx, y: by, width: btnW, height: btnH }, mapPage);
  }

  return updatedOffsets;
}
