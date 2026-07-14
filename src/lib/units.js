// Canonical storage unit for every weight in the app (sets, PRs, body weight)
// is POUNDS. These helpers are the only sanctioned conversion boundary:
// convert to the user's display unit on the way out, back to lb on the way in.
export const LB_PER_KG = 2.2046226218;

export const BARS = { lb: 45, kg: 20 };
export const PLATES = {
  lb: [45, 35, 25, 10, 5, 2.5],
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
};

const round1 = (n) => Math.round(n * 10) / 10;
const round4 = (n) => Math.round(n * 10000) / 10000;

export function toDisplay(lb, unit) {
  const n = parseFloat(lb);
  if (!Number.isFinite(n)) return 0;
  return unit === 'kg' ? round1(n / LB_PER_KG) : round4(n);
}

export function toLb(value, unit) {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return 0;
  return unit === 'kg' ? round4(n * LB_PER_KG) : round4(n);
}

export function toDisplayVolume(lb, unit) {
  const n = parseFloat(lb);
  if (!Number.isFinite(n)) return 0;
  return Math.round(unit === 'kg' ? n / LB_PER_KG : n);
}

export function formatWeight(lb, unit) {
  return `${toDisplay(lb, unit)} ${unit === 'kg' ? 'kg' : 'lb'}`;
}
