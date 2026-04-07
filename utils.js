/**
 * Calcula el trimestre actual a partir de una fecha dada.
 * @param {Date} date - La fecha para calcular el trimestre.
 * @returns {string} El trimestre en formato "Qx YYYY" (ej. "Q1 2024").
 */
export function getQuarterFromDate(date) {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  const quarter = Math.floor(month / 3) + 1;
  return `Q${quarter} ${year}`;
}