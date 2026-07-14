// Gera a planilha Excel formatada (cores, bordas, cabeçalho fixo, largura de
// coluna, aba de farol de controle e a foto de cada não conformidade
// encaixada na célula) usando exceljs. Roda 100% no navegador.

import ExcelJS from 'exceljs';

const BRAND_BLUE = 'FF2A78D6';
const BRAND_BLUE_DARK = 'FF184F95';
const HEADER_TEXT = 'FFFFFFFF';
const ROW_ALT = 'FFF4F7FC';
const BORDER_COLOR = 'FFD9DEE7';
const INK = 'FF0B0B0B';
const MUTED = 'FF767676';

const FAROL_VERDE = 'FF0CA30C';
const FAROL_VERDE_BG = 'FFE3F7E3';
const FAROL_AMARELO = 'FFC98500';
const FAROL_AMARELO_BG = 'FFFFF4DE';
const FAROL_VERMELHO = 'FFD03B3B';
const FAROL_VERMELHO_BG = 'FFFBE6E6';

const THIN_BORDER = {
  top: { style: 'thin', color: { argb: BORDER_COLOR } },
  left: { style: 'thin', color: { argb: BORDER_COLOR } },
  bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
  right: { style: 'thin', color: { argb: BORDER_COLOR } },
};

// Conversões aproximadas usadas pelo Excel (fonte padrão Calibri 11)
function colWidthToPx(charWidth) {
  return Math.round(charWidth * 7 + 5);
}
function rowHeightPtToPx(pt) {
  return Math.round(pt * (96 / 72));
}

function styleHeaderRow(row) {
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_BLUE } };
    cell.font = { color: { argb: HEADER_TEXT }, bold: true, size: 10.5 };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = THIN_BORDER;
  });
  row.height = 22;
}

function addSummarySheet(wb, name, title, columns, rows) {
  const sheet = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 2 }] });
  sheet.mergeCells(1, 1, 1, columns.length);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 13, color: { argb: BRAND_BLUE_DARK } };
  sheet.getRow(1).height = 26;

  sheet.columns = columns.map(c => ({ header: c.header, key: c.key, width: c.width }));
  const headerRow = sheet.getRow(2);
  columns.forEach((c, i) => { headerRow.getCell(i + 1).value = c.header; });
  styleHeaderRow(headerRow);

  rows.forEach((r, idx) => {
    const row = sheet.addRow(r);
    row.eachCell(cell => {
      cell.border = THIN_BORDER;
      cell.font = { size: 10, color: { argb: INK } };
      cell.alignment = { vertical: 'middle' };
    });
    if (idx % 2 === 1) {
      row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROW_ALT } }; });
    }
  });

  sheet.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: columns.length } };
  return sheet;
}

/**
 * Classifica um total de não conformidades num farol (verde/amarelo/vermelho)
 * a partir dos limiares calculados sobre a própria distribuição do lote
 * (terços da amplitude entre o menor e o maior valor), para o farol se
 * adaptar à realidade de cada empreendimento em vez de usar números fixos.
 */
function buildFarolThresholds(values) {
  if (values.length === 0) return { low: 5, high: 15 };
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = Math.max(1, max - min);
  return {
    low: min + span / 3,
    high: min + (span * 2) / 3,
  };
}

function farolFor(value, thresholds) {
  if (value <= thresholds.low) return { label: 'Regular', color: FAROL_VERDE, bg: FAROL_VERDE_BG, emoji: '🟢' };
  if (value <= thresholds.high) return { label: 'Atenção', color: FAROL_AMARELO, bg: FAROL_AMARELO_BG, emoji: '🟡' };
  return { label: 'Crítico', color: FAROL_VERMELHO, bg: FAROL_VERMELHO_BG, emoji: '🔴' };
}

function addFarolSheet(wb, { unitRows, catRows }) {
  const sheet = wb.addWorksheet('Farol de Controle', { views: [{ state: 'frozen', ySplit: 3 }] });

  sheet.mergeCells(1, 1, 1, 5);
  const title = sheet.getCell(1, 1);
  title.value = 'Farol de Controle — Não Conformidades por Unidade';
  title.font = { bold: true, size: 14, color: { argb: BRAND_BLUE_DARK } };
  sheet.getRow(1).height = 28;

  sheet.mergeCells(2, 1, 2, 5);
  const subtitle = sheet.getCell(2, 1);
  subtitle.value = 'Classificação automática por volume de apontamentos: 🟢 Regular · 🟡 Atenção · 🔴 Crítico';
  subtitle.font = { size: 10, italic: true, color: { argb: MUTED } };
  sheet.getRow(2).height = 18;

  const columns = [
    { header: 'Unidade', key: 'unidade', width: 16 },
    { header: 'Total de Não Conformidades', key: 'total', width: 24 },
    { header: 'Farol', key: 'farol', width: 12 },
    { header: 'Situação', key: 'situacao', width: 16 },
    { header: 'Indicador Visual', key: 'barra', width: 34 },
  ];
  sheet.columns = columns;
  const headerRow = sheet.getRow(3);
  columns.forEach((c, i) => { headerRow.getCell(i + 1).value = c.header; });
  styleHeaderRow(headerRow);

  const values = unitRows.map(r => r.total);
  const thresholds = buildFarolThresholds(values);
  const maxVal = Math.max(1, ...values);

  unitRows.forEach((r, idx) => {
    const rowNum = idx + 4;
    const farol = farolFor(r.total, thresholds);
    const barLength = Math.max(1, Math.round((r.total / maxVal) * 28));
    const row = sheet.getRow(rowNum);
    row.getCell(1).value = r.unidade;
    row.getCell(2).value = r.total;
    row.getCell(3).value = farol.emoji;
    row.getCell(4).value = farol.label;
    row.getCell(5).value = '█'.repeat(barLength);
    row.getCell(5).font = { color: { argb: farol.color }, size: 11 };

    row.eachCell({ includeEmpty: true }, cell => {
      cell.border = THIN_BORDER;
      if (cell.col !== 5) cell.font = cell.font || { size: 10, color: { argb: INK } };
      cell.alignment = { vertical: 'middle', horizontal: cell.col === 3 ? 'center' : 'left' };
    });
    row.getCell(3).font = { size: 13 };
    row.getCell(4).font = { size: 10, bold: true, color: { argb: farol.color } };
    row.eachCell({ includeEmpty: true }, cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: farol.bg } };
    });
  });

  sheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: columns.length } };

  // farol por categoria, ao lado (colunas G..K)
  const catStartCol = 7;
  sheet.getCell(3, catStartCol).value = 'Categoria';
  sheet.getCell(3, catStartCol + 1).value = 'Quantidade';
  sheet.getCell(3, catStartCol + 2).value = '% do Total';
  sheet.getColumn(catStartCol).width = 40;
  sheet.getColumn(catStartCol + 1).width = 14;
  sheet.getColumn(catStartCol + 2).width = 12;
  for (let c = catStartCol; c <= catStartCol + 2; c++) {
    const cell = sheet.getCell(3, c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_BLUE } };
    cell.font = { color: { argb: HEADER_TEXT }, bold: true, size: 10.5 };
    cell.border = THIN_BORDER;
    cell.alignment = { vertical: 'middle' };
  }
  catRows.forEach((r, idx) => {
    const rowNum = idx + 4;
    sheet.getCell(rowNum, catStartCol).value = r.categoria;
    sheet.getCell(rowNum, catStartCol + 1).value = r.count;
    sheet.getCell(rowNum, catStartCol + 2).value = r.pct;
    for (let c = catStartCol; c <= catStartCol + 2; c++) {
      const cell = sheet.getCell(rowNum, c);
      cell.border = THIN_BORDER;
      cell.font = { size: 10, color: { argb: INK } };
      if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROW_ALT } };
    }
  });

  return sheet;
}

export async function buildWorkbook({ semFoto, pageByFile }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Extrator de Vistorias';
  wb.created = new Date();

  // ---- Resumo por Unidade ----
  const unitCounts = {};
  semFoto.forEach(it => { unitCounts[it.unidade] = (unitCounts[it.unidade] || 0) + 1; });
  const unitRows = Object.entries(unitCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([unidade, count]) => ({ unidade, total: count }));

  // ---- Resumo por Categoria ----
  const catCounts = {};
  semFoto.forEach(it => { catCounts[it.categoria] = (catCounts[it.categoria] || 0) + 1; });
  const catRows = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([categoria, count]) => ({
      categoria, count, pct: semFoto.length ? ((count / semFoto.length) * 100).toFixed(1) + '%' : '0%',
    }));

  // ---- Farol de Controle (primeira aba — visão executiva) ----
  addFarolSheet(wb, { unitRows, catRows });

  addSummarySheet(wb, 'Resumo por Unidade', 'Não conformidades por unidade', [
    { header: 'Unidade', key: 'unidade', width: 20 },
    { header: 'Total de Não Conformidades', key: 'total', width: 26 },
  ], unitRows);

  addSummarySheet(wb, 'Resumo por Categoria', 'Não conformidades por categoria', [
    { header: 'Categoria', key: 'categoria', width: 42 },
    { header: 'Quantidade', key: 'count', width: 14 },
    { header: '% do Total', key: 'pct', width: 12 },
  ], catRows);

  // ---- Detalhamento das Não Conformidades — com foto ----
  const sheet = wb.addWorksheet('Detalhamento', { views: [{ state: 'frozen', ySplit: 1 }] });
  const PHOTO_COL_WIDTH_CHARS = 24;
  const columns = [
    { header: 'Foto', key: 'foto', width: PHOTO_COL_WIDTH_CHARS },
    { header: 'Unidade', key: 'unidade', width: 16 },
    { header: 'Ambiente', key: 'ambiente', width: 22 },
    { header: 'Descrição Original (Laudo)', key: 'descricao', width: 55 },
    { header: 'Categoria (Classificação)', key: 'categoria', width: 34 },
    { header: 'Nº da Foto', key: 'fotoNum', width: 11 },
    { header: 'Arquivo de Origem', key: 'arquivo', width: 20 },
    { header: 'Página no PDF Consolidado', key: 'pagina', width: 14 },
  ];
  sheet.columns = columns;
  styleHeaderRow(sheet.getRow(1));

  const ROW_HEIGHT_PT = 92;
  sheet.properties.defaultRowHeight = ROW_HEIGHT_PT;

  const colPx = colWidthToPx(PHOTO_COL_WIDTH_CHARS);
  const rowPx = rowHeightPtToPx(ROW_HEIGHT_PT);
  const PADDING_PX = 6;
  const availableWidthPx = colPx - PADDING_PX * 2;
  const availableHeightPx = rowPx - PADDING_PX * 2;
  const paddingColFrac = PADDING_PX / colPx;
  const paddingRowFrac = PADDING_PX / rowPx;

  semFoto.forEach((it, idx) => {
    const rowNum = idx + 2;
    const row = sheet.getRow(rowNum);
    row.getCell(2).value = it.unidade;
    row.getCell(3).value = it.ambiente;
    row.getCell(4).value = it.descricao;
    row.getCell(5).value = it.categoria;
    row.getCell(6).value = Number(it.fotoNum);
    row.getCell(7).value = it.arquivo;
    row.getCell(8).value = pageByFile[it.arquivo] || '';
    row.height = ROW_HEIGHT_PT;

    row.eachCell({ includeEmpty: true }, cell => {
      cell.border = THIN_BORDER;
      cell.font = { size: 9.5, color: { argb: INK } };
      cell.alignment = { vertical: 'middle', wrapText: cell.col === 4 };
    });
    if (idx % 2 === 1) {
      row.eachCell({ includeEmpty: true }, cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROW_ALT } };
      });
    }

    if (it.thumbnail && it.thumbnail.buffer) {
      const imgId = wb.addImage({ buffer: it.thumbnail.buffer, extension: 'jpeg' });
      const aspect = it.thumbnail.width / it.thumbnail.height;
      let imgHeightPx = availableHeightPx;
      let imgWidthPx = imgHeightPx * aspect;
      if (imgWidthPx > availableWidthPx) {
        imgWidthPx = availableWidthPx;
        imgHeightPx = imgWidthPx / aspect;
      }
      const offsetColFrac = paddingColFrac + (availableWidthPx - imgWidthPx) / 2 / colPx;
      const offsetRowFrac = paddingRowFrac + (availableHeightPx - imgHeightPx) / 2 / rowPx;

      sheet.addImage(imgId, {
        tl: { col: offsetColFrac, row: rowNum - 1 + offsetRowFrac },
        ext: { width: imgWidthPx, height: imgHeightPx },
        editAs: 'oneCell',
      });
    } else {
      row.getCell(1).value = '(sem foto)';
      row.getCell(1).font = { size: 9, italic: true, color: { argb: MUTED } };
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    }
  });

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

  const buffer = await wb.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}
