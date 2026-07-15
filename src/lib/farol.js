// Farol de severidade compartilhado entre o Excel e o PDF: classifica o
// volume de não conformidades de cada unidade em Regular/Atenção/Crítico,
// com limiares calculados sobre a própria distribuição do lote (em vez de
// números fixos), para se adaptar à realidade de cada empreendimento.

export const FAROL_COLORS = {
  regular: { hex: '0CA30C', bg: 'E3F7E3' },
  atencao: { hex: 'C98500', bg: 'FFF4DE' },
  critico: { hex: 'D03B3B', bg: 'FBE6E6' },
};

export function buildFarolThresholds(values) {
  if (values.length === 0) return { low: 5, high: 15 };
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = Math.max(1, max - min);
  return {
    low: min + span / 3,
    high: min + (span * 2) / 3,
  };
}

export function farolFor(value, thresholds) {
  if (value <= thresholds.low) return { key: 'regular', label: 'Regular', emoji: '🟢', ...FAROL_COLORS.regular };
  if (value <= thresholds.high) return { key: 'atencao', label: 'Atenção', emoji: '🟡', ...FAROL_COLORS.atencao };
  return { key: 'critico', label: 'Crítico', emoji: '🔴', ...FAROL_COLORS.critico };
}

export function hexToFraction(hex) {
  const n = parseInt(hex, 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}
