// Converte o conteúdo do editor de texto rico (JSON do Tiptap) em uma ou
// mais páginas de PDF desenhadas com pdf-lib, preservando negrito, itálico,
// sublinhado, cor, tamanho de fonte, marca-texto e alinhamento.

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

function parsePx(value, fallback) {
  if (!value) return fallback;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Extrai os runs de um nó de parágrafo/heading (texto, estilo, quebras
 * manuais), com um prefixo opcional (usado para marcadores de lista).
 */
function extractParagraphRuns(node, prefix) {
  const align = node.attrs?.textAlign || 'left';
  const runs = [];
  if (prefix) runs.push({ text: prefix, bold: false, italic: false, underline: false, color: null, fontSize: 13, highlight: null });
  (node.content || []).forEach(textNode => {
    if (textNode.type === 'hardBreak') {
      runs.push({ forceBreak: true });
      return;
    }
    if (textNode.type !== 'text') return;
    const marks = textNode.marks || [];
    const bold = marks.some(m => m.type === 'bold');
    const italic = marks.some(m => m.type === 'italic');
    const underline = marks.some(m => m.type === 'underline');
    const textStyle = marks.find(m => m.type === 'textStyle');
    const highlightMark = marks.find(m => m.type === 'highlight');
    runs.push({
      text: textNode.text,
      bold, italic, underline,
      color: textStyle?.attrs?.color || null,
      fontSize: parsePx(textStyle?.attrs?.fontSize, 13),
      highlight: highlightMark?.attrs?.color || null,
    });
  });
  return { align, runs };
}

/**
 * Extrai uma lista plana de parágrafos (runs + alinhamento) do doc do
 * Tiptap, "achatando" listas com marcador/numeradas em uma linha por item.
 */
function extractRuns(doc) {
  const paragraphs = [];
  const content = doc?.content || [];

  function walkList(listNode, ordered) {
    (listNode.content || []).forEach((listItem, idx) => {
      const prefix = ordered ? `${idx + 1}. ` : '• ';
      let first = true;
      (listItem.content || []).forEach(child => {
        if (child.type === 'paragraph' || child.type === 'heading') {
          paragraphs.push(extractParagraphRuns(child, first ? prefix : '    '));
          first = false;
        } else if (child.type === 'bulletList') {
          walkList(child, false);
        } else if (child.type === 'orderedList') {
          walkList(child, true);
        }
      });
    });
  }

  content.forEach(node => {
    if (node.type === 'paragraph' || node.type === 'heading') {
      paragraphs.push(extractParagraphRuns(node, ''));
    } else if (node.type === 'bulletList') {
      walkList(node, false);
    } else if (node.type === 'orderedList') {
      walkList(node, true);
    } else {
      paragraphs.push({ align: 'left', runs: [] });
    }
  });

  return paragraphs;
}

function pickFont(fonts, bold, italic) {
  if (bold && italic) return fonts.boldItalic;
  if (bold) return fonts.bold;
  if (italic) return fonts.italic;
  return fonts.regular;
}

function drawHeader(page, pageW, pageH, subtitle) {
  page.drawRectangle({ x: 0, y: 0, width: pageW, height: pageH, color: PAGE_BG });
  const headerH = 74;
  page.drawRectangle({ x: 0, y: pageH - headerH, width: pageW, height: headerH, color: NAVY });
  page.drawRectangle({ x: 0, y: pageH - headerH - 3, width: pageW, height: 3, color: BLUE });
}

/**
 * Insere páginas de introdução em mergedDoc, no índice indicado.
 * Retorna o número de páginas inseridas.
 */
export async function drawIntroContent(mergedDoc, introContent, fonts, insertAtIndex) {
  const paragraphs = extractRuns(introContent);
  const hasText = paragraphs.some(p => p.runs.some(r => r.text?.trim()));
  if (!hasText) return 0;

  const [pageW, pageH] = PageSizes.A4.slice().reverse();
  const cardMargin = 32;
  const headerH = 74;
  const innerPad = 28;

  let pageIndex = insertAtIndex;
  let page = mergedDoc.insertPage(pageIndex, [pageW, pageH]);
  let pagesInserted = 1;
  drawHeader(page, pageW, pageH, 'Introdução');
  page.drawText('Introdução', { x: 40, y: pageH - 34, size: 20, font: fonts.bold, color: WHITE });
  page.drawText('Escopo e contexto do trabalho desenvolvido', {
    x: 40, y: pageH - 53, size: 10.5, font: fonts.regular, color: c('CFE0F5'),
  });

  const cardTop = pageH - headerH - 16;
  const cardBottom = 54;
  const cardX = cardMargin;
  const cardW = pageW - cardMargin * 2;

  function newContentPage() {
    page = mergedDoc.insertPage(pageIndex + pagesInserted, [pageW, pageH]);
    pagesInserted++;
    page.drawRectangle({ x: 0, y: 0, width: pageW, height: pageH, color: PAGE_BG });
    return cardTop;
  }

  page.drawRectangle({ x: cardX + 2, y: cardBottom - 2, width: cardW, height: cardTop - cardBottom, color: SHADOW, opacity: 0.5 });
  page.drawRectangle({
    x: cardX, y: cardBottom, width: cardW, height: cardTop - cardBottom,
    color: WHITE, borderColor: BORDER_LIGHT, borderWidth: 1,
  });

  let y = cardTop - innerPad;
  const textLeft = cardX + innerPad;
  const textRight = cardX + cardW - innerPad;
  const maxWidth = textRight - textLeft;

  const ensureSpace = (lineHeight) => {
    if (y - lineHeight < cardBottom + innerPad) {
      y = newContentPage() - innerPad;
      page.drawRectangle({ x: cardX + 2, y: cardBottom - 2, width: cardW, height: cardTop - cardBottom, color: SHADOW, opacity: 0.5 });
      page.drawRectangle({
        x: cardX, y: cardBottom, width: cardW, height: cardTop - cardBottom,
        color: WHITE, borderColor: BORDER_LIGHT, borderWidth: 1,
      });
    }
  };

  paragraphs.forEach(paragraph => {
    if (paragraph.runs.length === 0) {
      ensureSpace(14);
      y -= 14;
      return;
    }

    // separa cada run em palavras, preservando o estilo; quebras de linha
    // manuais (shift+enter) viram um marcador que força nova linha
    const words = [];
    paragraph.runs.forEach(run => {
      if (run.forceBreak) {
        words.push({ forceBreak: true });
        return;
      }
      const parts = run.text.split(/(\s+)/).filter(s => s.length > 0);
      parts.forEach(part => words.push({ ...run, text: part }));
    });

    let line = [];
    let lineWidth = 0;
    const lines = [];

    words.forEach(word => {
      if (word.forceBreak) {
        lines.push({ words: line, width: lineWidth });
        line = [];
        lineWidth = 0;
        return;
      }
      const font = pickFont(fonts, word.bold, word.italic);
      const w = font.widthOfTextAtSize(word.text, word.fontSize);
      if (lineWidth + w > maxWidth && line.length > 0 && word.text.trim()) {
        lines.push({ words: line, width: lineWidth });
        line = [];
        lineWidth = 0;
      }
      line.push({ ...word, width: w });
      lineWidth += w;
    });
    if (line.length > 0) lines.push({ words: line, width: lineWidth });

    lines.forEach((lineData, lineIdx) => {
      const maxFontSize = lineData.words.length > 0
        ? Math.max(...lineData.words.map(w => w.fontSize))
        : 13;
      const lineHeight = maxFontSize * 1.5;
      ensureSpace(lineHeight);
      y -= lineHeight;

      let x = textLeft;
      if (paragraph.align === 'center') x = textLeft + (maxWidth - lineData.width) / 2;
      if (paragraph.align === 'right') x = textRight - lineData.width;

      // justificado: distribui o espaço sobrando entre as lacunas de espaço
      // da linha, exceto na última linha do parágrafo (regra tipográfica padrão)
      let extraPerGap = 0;
      if (paragraph.align === 'justify' && lineIdx < lines.length - 1) {
        const gapCount = lineData.words.filter(w => /^\s+$/.test(w.text)).length;
        if (gapCount > 0) extraPerGap = (maxWidth - lineData.width) / gapCount;
      }

      lineData.words.forEach(word => {
        const font = pickFont(fonts, word.bold, word.italic);
        if (word.highlight) {
          page.drawRectangle({
            x, y: y - 2, width: word.width, height: word.fontSize + 4,
            color: c(word.highlight),
          });
        }
        page.drawText(word.text, {
          x, y, size: word.fontSize, font,
          color: word.color ? c(word.color) : INK,
        });
        if (word.underline) {
          page.drawRectangle({ x, y: y - 1.5, width: word.width, height: 0.75, color: word.color ? c(word.color) : INK });
        }
        x += word.width + (extraPerGap > 0 && /^\s+$/.test(word.text) ? extraPerGap : 0);
      });
    });

    y -= 6; // espaço entre parágrafos
  });

  return pagesInserted;
}
