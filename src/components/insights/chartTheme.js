// Single source for Recharts color constants. Task-4 flips these values to the
// dark set; chart JSX must contain no color hex literals.
export const GRID_STROKE = '#27272A';
export const AXIS_TICK = { fontSize: 12, fill: '#A1A1AA' };
export const REF_LINE = '#52525B';
export const SERIES = {
  weeklyBars: '#6366F1',        // indigo-500: 600 fails 3:1 on card
  weeklyBarsEmpty: '#26262E',
  volumeBars: '#3F3F46',
  proteinLine: 'var(--color-protein)',
  weightLine: '#818CF8',        // mirrors --ring / indigo training accent
  deficit: '#60A5FA',
  surplus: '#FB923C',
  balanceOpacity: 0.85,          // 0.6 drops below 3:1 on dark
  prDot: '#FBBF24',
  prDotHalo: '#15151B',          // halo matches card, not white
  caloriesContext: '#71717A',
};
export const gridProps = { strokeDasharray: '3 3', vertical: false, stroke: GRID_STROKE };
