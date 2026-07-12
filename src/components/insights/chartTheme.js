// Single source for Recharts color constants. Task-4 flips these values to the
// dark set; chart JSX must contain no color hex literals.
export const GRID_STROKE = '#f1f5f9';
export const AXIS_TICK = { fontSize: 12, fill: '#94a3b8' };
export const REF_LINE = '#cbd5e1';
export const SERIES = {
  weeklyBars: '#4f46e5',
  weeklyBarsEmpty: '#e2e8f0',
  volumeBars: '#e2e8f0',
  proteinLine: 'var(--color-protein)',
  weightLine: '#4f46e5',
  deficit: '#60a5fa',
  surplus: '#fb923c',
  balanceOpacity: 0.6,
  prDot: '#f59e0b',
  prDotHalo: '#ffffff',
  caloriesContext: '#94a3b8',
};
export const gridProps = { strokeDasharray: '3 3', vertical: false, stroke: GRID_STROKE };
