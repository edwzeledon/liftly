// src/lib/__tests__/units.test.js
import { LB_PER_KG, BARS, PLATES, toDisplay, toLb, toDisplayVolume, formatWeight } from '../units';

describe('units', () => {
  test('lb passthrough both directions', () => {
    expect(toDisplay(225, 'lb')).toBe(225);
    expect(toLb('225', 'lb')).toBe(225);
  });

  test('kg display rounds to 1 decimal', () => {
    expect(toDisplay(225, 'kg')).toBe(102.1); // 225 / 2.2046226218 = 102.058…
  });

  test('kg entry converts to lb rounded to 4 decimals', () => {
    expect(toLb(100, 'kg')).toBe(220.4623);
  });

  test('round-trip is stable at kg precision', () => {
    expect(toDisplay(toLb('102.5', 'kg'), 'kg')).toBe(102.5);
  });

  test('blank or invalid input maps to 0', () => {
    expect(toLb('', 'kg')).toBe(0);
    expect(toDisplay(undefined, 'lb')).toBe(0);
    expect(toDisplay('-', 'kg')).toBe(0);
  });

  test('volume converts to whole numbers', () => {
    expect(toDisplayVolume(12500, 'lb')).toBe(12500);
    expect(toDisplayVolume(12500, 'kg')).toBe(5670); // 12500 / 2.2046226218 = 5669.99…
  });

  test('formatWeight uses lowercase unit words', () => {
    expect(formatWeight(225, 'lb')).toBe('225 lb');
    expect(formatWeight(225.9738, 'kg')).toBe('102.5 kg');
  });

  test('bar and plate constants are exact', () => {
    expect(LB_PER_KG).toBe(2.2046226218);
    expect(BARS).toEqual({ lb: 45, kg: 20 });
    expect(PLATES.lb).toEqual([45, 35, 25, 10, 5, 2.5]);
    expect(PLATES.kg).toEqual([25, 20, 15, 10, 5, 2.5, 1.25]);
  });
});
