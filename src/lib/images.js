// Extrai as fotos embutidas em um PDF de vistoria, na ordem em que aparecem,
// e gera thumbnails redimensionados para uso no Excel. Roda 100% no navegador.

import { PDFName } from 'pdf-lib';
import jpeg from 'jpeg-js';

const THUMB_MAX_WIDTH = 180;

function isJpeg(bytes) {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8;
}

// Hash simples (FNV-1a de 32 bits) — usado só para detectar bytes idênticos
// repetidos (logomarca), não para segurança.
function hashBytes(bytes) {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16) + ':' + bytes.length;
}

export function extractImagesInOrder(pdfDoc) {
  const images = [];
  const pages = pdfDoc.getPages();

  for (const page of pages) {
    const resources = page.node.Resources();
    if (!resources) continue;
    const xobjectsRef = resources.get(PDFName.of('XObject'));
    if (!xobjectsRef) continue;
    const xobjectsDict = pdfDoc.context.lookup(xobjectsRef);
    if (!xobjectsDict || typeof xobjectsDict.keys !== 'function') continue;

    for (const key of xobjectsDict.keys()) {
      const xobj = pdfDoc.context.lookup(xobjectsDict.get(key));
      if (!xobj || !xobj.dict) continue;
      const subtype = xobj.dict.get(PDFName.of('Subtype'));
      if (!subtype || subtype.toString() !== '/Image') continue;

      const filter = xobj.dict.get(PDFName.of('Filter'));
      const filterName = filter ? filter.toString() : '';
      const bytes = xobj.contents;
      if (!bytes) continue;

      if (filterName.includes('DCTDecode') && isJpeg(bytes)) {
        images.push(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
      }
    }
  }

  return images;
}

/**
 * Remove imagens cujo conteúdo se repita mais de uma vez no documento
 * (logomarca/cabeçalho reaproveitado em várias páginas), preservando a
 * ordem das que restarem.
 */
export function removeRepeatedImages(images) {
  const hashCounts = new Map();
  images.forEach(img => {
    const h = hashBytes(img);
    hashCounts.set(h, (hashCounts.get(h) || 0) + 1);
  });
  return images.filter(img => hashCounts.get(hashBytes(img)) === 1);
}

export function makeThumbnail(jpegBytes) {
  try {
    const decoded = jpeg.decode(jpegBytes, { maxMemoryUsageInMB: 512 });
    if (!decoded || !decoded.width) return null;

    const scale = Math.min(1, THUMB_MAX_WIDTH / decoded.width);
    const outW = Math.max(1, Math.round(decoded.width * scale));
    const outH = Math.max(1, Math.round(decoded.height * scale));

    const src = decoded.data;
    const dst = new Uint8Array(outW * outH * 4);

    for (let y = 0; y < outH; y++) {
      const sy = Math.min(decoded.height - 1, Math.floor(y / scale));
      for (let x = 0; x < outW; x++) {
        const sx = Math.min(decoded.width - 1, Math.floor(x / scale));
        const sIdx = (sy * decoded.width + sx) * 4;
        const dIdx = (y * outW + x) * 4;
        dst[dIdx] = src[sIdx];
        dst[dIdx + 1] = src[sIdx + 1];
        dst[dIdx + 2] = src[sIdx + 2];
        dst[dIdx + 3] = 255;
      }
    }

    const encoded = jpeg.encode({ data: dst, width: outW, height: outH }, 62);
    return { buffer: encoded.data, width: outW, height: outH };
  } catch (e) {
    return null;
  }
}
