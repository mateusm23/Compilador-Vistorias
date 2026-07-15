// Reconhecimento do padrão de código de unidade a partir do nome do arquivo
// (ex: "1002 A.pdf" -> pavimento 10, unidade 02, lado A). Compartilhado entre
// a interface (para montar o mapa em tempo real) e o gerador de PDF.

export function normalizeCode(u) {
  return u.replace(/\s+/g, '').toUpperCase();
}

// Código no padrão "<pavimento><02><bloco>", ex: 1002A, 301B, 1204C
// O bloco aceita qualquer letra única, não só A/B, para suportar
// empreendimentos com mais de duas torres.
export function parseUnitCode(code) {
  const m = code.match(/^(\d+)([A-Z])$/i);
  if (!m) return null;
  const digits = m[1];
  const lado = m[2].toUpperCase();
  if (digits.length < 3) return null;
  const num = digits.slice(-2);
  const pav = digits.slice(0, -2);
  return { pav: parseInt(pav, 10), num: parseInt(num, 10), lado, pavStr: pav };
}

// Monta o código de uma unidade a partir de pavimento/número/bloco, no mesmo
// formato reconhecido por parseUnitCode.
export function buildUnitCode(pav, num, lado) {
  return `${pav}${String(num).padStart(2, '0')}${lado}`;
}

export function unidadeFromFilename(filename) {
  return filename.replace(/\.pdf$/i, '').trim();
}

/**
 * Recebe uma lista de nomes de arquivo e retorna as unidades reconhecidas
 * (com pavimento/lado/número) e as não reconhecidas, além dos limites
 * inferidos de pavimentos e lados detectados.
 */
export function detectUnitsFromFilenames(filenames) {
  const parsed = [];
  const naoReconhecidas = [];

  filenames.forEach(filename => {
    const unidade = unidadeFromFilename(filename);
    const code = normalizeCode(unidade);
    const p = parseUnitCode(code);
    if (p) parsed.push({ unidade, filename, code, ...p });
    else naoReconhecidas.push({ unidade, filename });
  });

  const pavimentos = parsed.map(p => p.pav);
  const lados = [...new Set(parsed.map(p => p.lado))].sort();
  const nums = parsed.map(p => p.num);

  const bounds = parsed.length > 0 ? {
    pavMin: Math.min(...pavimentos),
    pavMax: Math.max(...pavimentos),
    numMin: Math.min(...nums),
    numMax: Math.max(...nums),
    lados: lados.length > 0 ? lados : ['A'],
  } : { pavMin: 1, pavMax: 1, numMin: 1, numMax: 4, lados: ['A'] };

  return { parsed, naoReconhecidas, bounds };
}
