// Núcleo de processamento — orquestra extração de texto, classificação,
// extração de fotos, PDF consolidado com mapa clicável e planilha Excel
// formatada. Roda 100% no navegador (chamado de dentro do Web Worker).

import { PDFDocument } from 'pdf-lib';
import { extractText } from './pdfText.js';
import { classify, parseItems } from './classify.js';
import { addNavigation } from './pdfmap.js';
import { extractImagesInOrder, removeRepeatedImages, makeThumbnail } from './images.js';
import { buildWorkbook } from './excelExport.js';

/**
 * files: [{ filename, arrayBuffer }]
 * onProgress: optional (msg) => void
 * extra: { reportData, logo: {arrayBuffer, type}, capaPhoto: {arrayBuffer, type}, introContent }
 * returns: { xlsxBytes: Uint8Array, pdfBytes: Uint8Array, stats }
 */
export async function processFiles(files, onProgress, extra = {}) {
  const log = onProgress || (() => {});
  const allItems = [];
  const merged = await PDFDocument.create();
  const offsets = [];
  let currentPage = 0;

  for (const file of files) {
    const unidade = file.filename.replace(/\.pdf$/i, '').trim();
    log(`Lendo ${file.filename}...`);

    let items = [];
    try {
      // pdfjs assume posse (transfere/esvazia) o ArrayBuffer que recebe, então
      // cada consumidor abaixo precisa da sua própria cópia independente.
      const text = await extractText(file.arrayBuffer.slice(0));
      items = parseItems(text, unidade, file.filename);
    } catch (e) {
      log(`  [erro ao ler texto de ${file.filename}] ${e.message}`);
    }

    let thumbnails = [];
    try {
      const srcForImages = await PDFDocument.load(file.arrayBuffer.slice(0));
      const photos = removeRepeatedImages(extractImagesInOrder(srcForImages));
      if (photos.length === items.length) {
        thumbnails = photos.map(p => makeThumbnail(p));
      } else {
        log(`  [aviso] ${file.filename}: ${items.length} itens de texto mas ${photos.length} fotos únicas — fotos não serão anexadas para este arquivo.`);
        thumbnails = items.map(() => null);
      }
    } catch (e) {
      log(`  [erro ao extrair fotos de ${file.filename}] ${e.message}`);
      thumbnails = items.map(() => null);
    }

    items.forEach((it, idx) => {
      allItems.push({ ...it, categoria: classify(it.descricao), thumbnail: thumbnails[idx] || null });
    });

    try {
      const src = await PDFDocument.load(file.arrayBuffer.slice(0));
      const pageCount = src.getPageCount();
      const copiedPages = await merged.copyPages(src, src.getPageIndices());
      copiedPages.forEach(p => merged.addPage(p));
      offsets.push({ unidade, filename: file.filename, startPage: currentPage + 1, pageCount });
      currentPage += pageCount;
    } catch (e) {
      log(`  [erro ao mesclar página de ${file.filename}] ${e.message}`);
    }
  }

  const semFoto = allItems.filter(it => it.categoria !== 'Registro Fotográfico (sem patologia)');
  const unitCounts = {};
  semFoto.forEach(it => { unitCounts[it.unidade] = (unitCounts[it.unidade] || 0) + 1; });

  log('Criando capa e mapa clicável no PDF...');
  const navigableOffsets = await addNavigation(merged, offsets, {
    unitCounts,
    totalNaoConformidades: semFoto.length,
    reportData: extra.reportData,
    logo: extra.logo,
    capaPhoto: extra.capaPhoto,
    introContent: extra.introContent,
  });

  const pageByFile = {};
  navigableOffsets.forEach(o => { pageByFile[o.filename] = o.startPage; });

  log('Gerando planilha formatada...');
  const xlsxBytes = await buildWorkbook({ semFoto, pageByFile });

  log('Consolidando PDF...');
  const pdfBytes = await merged.save();

  return {
    xlsxBytes,
    pdfBytes,
    stats: {
      totalArquivos: files.length,
      totalUnidadesMescladas: offsets.length,
      totalNaoConformidades: semFoto.length,
      totalPaginasConsolidado: merged.getPageCount(),
      totalComFoto: semFoto.filter(it => it.thumbnail).length,
    },
  };
}
