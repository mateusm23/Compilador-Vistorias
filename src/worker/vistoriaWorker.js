// Web Worker: roda todo o processamento pesado (extração de PDF, fotos,
// planilha e mesclagem) fora da thread principal, para a interface não travar.

import { Buffer } from 'buffer';
// exceljs referencia o global `Buffer` do Node em alguns pontos internos.
globalThis.Buffer = globalThis.Buffer || Buffer;

import { processFiles } from '../lib/core.js';

self.onmessage = async (event) => {
  const { type, files, reportData, logo, capaPhoto, introContent, buildingConfig, categories, unitCategoryOverrides } = event.data;
  if (type !== 'process') return;

  try {
    const result = await processFiles(files, (msg) => {
      self.postMessage({ type: 'log', message: msg });
    }, { reportData, logo, capaPhoto, introContent, buildingConfig, categories, unitCategoryOverrides });

    self.postMessage({
      type: 'done',
      stats: result.stats,
      xlsxBytes: result.xlsxBytes,
      pdfBytes: result.pdfBytes,
    }, [result.xlsxBytes.buffer, result.pdfBytes.buffer]);
  } catch (e) {
    self.postMessage({ type: 'error', message: e.message, stack: e.stack });
  }
};
