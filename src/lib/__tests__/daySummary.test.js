import { dayVolumeLb, macroSplit } from '../daySummary';

describe('dayVolumeLb', () => {
  test('sums completed sets only', () => {
    const logs = [{ sets: [
      { weight: '100', reps: '5', completed: true },
      { weight: '200', reps: '5', completed: false },
    ] }];
    expect(dayVolumeLb(logs)).toBe(500);
  });

  test('ignores blank and garbage values', () => {
    const logs = [{ sets: [
      { weight: '', reps: '5', completed: true },
      { weight: '100', reps: '', completed: true },
      { weight: '135', reps: '3', completed: true },
    ] }];
    expect(dayVolumeLb(logs)).toBe(405);
  });

  test('handles missing sets and empty input', () => {
    expect(dayVolumeLb([{}, { sets: null }])).toBe(0);
    expect(dayVolumeLb([])).toBe(0);
    expect(dayVolumeLb(undefined)).toBe(0);
  });
});

describe('macroSplit', () => {
  test('null when all macros are zero or absent', () => {
    expect(macroSplit([{ protein: 0, carbs: 0, fats: 0 }])).toBeNull();
    expect(macroSplit([{}])).toBeNull();
    expect(macroSplit([])).toBeNull();
  });

  test('exact split', () => {
    // 25g P = 100 kcal, 25g C = 100 kcal, 0 fat → 50/50/0
    expect(macroSplit([{ protein: 25, carbs: 25, fats: 0 }])).toEqual({ p: 50, c: 50, f: 0 });
  });

  test('largest-remainder rounding sums to exactly 100', () => {
    // 1g each → 4/4/9 kcal → 23.53/23.53/52.94 → floors 23/23/52 (=98), +1 to f (.94) then p (.53, stable-sort before c)
    const s = macroSplit([{ protein: 1, carbs: 1, fats: 1 }]);
    expect(s).toEqual({ p: 24, c: 23, f: 53 });
    expect(s.p + s.c + s.f).toBe(100);
  });

  test('aggregates across multiple meals', () => {
    const s = macroSplit([
      { protein: 30, carbs: 0, fats: 0 },
      { protein: 0, carbs: 30, fats: 0 },
    ]);
    expect(s).toEqual({ p: 50, c: 50, f: 0 });
  });
});
