import { setVolume, logsVolume, bestSet, beatsBest, startOfWeek } from '../workoutStats';

describe('setVolume', () => {
  it('multiplies weight by reps', () => {
    expect(setVolume({ weight: 100, reps: 5 })).toBe(500);
  });
  it('returns 0 for missing or non-numeric values', () => {
    expect(setVolume({ weight: '', reps: 5 })).toBe(0);
    expect(setVolume({})).toBe(0);
  });
  it('parses string numbers (sets are stored as strings from inputs)', () => {
    expect(setVolume({ weight: '135', reps: '8' })).toBe(1080);
  });
});

describe('logsVolume', () => {
  it('sums volume across logs and sets', () => {
    const logs = [
      { sets: [{ weight: 100, reps: 5 }, { weight: 100, reps: 5 }] },
      { sets: [{ weight: 50, reps: 10 }] },
    ];
    expect(logsVolume(logs)).toBe(1500);
  });
  it('tolerates null/malformed sets', () => {
    expect(logsVolume([{ sets: null }, {}])).toBe(0);
  });
});

describe('bestSet', () => {
  const logs = [
    { sets: [{ weight: 200, reps: 3 }, { weight: 185, reps: 8 }] },
    { sets: [{ weight: 200, reps: 5 }] },
  ];
  it('picks max weight, ties broken by reps', () => {
    expect(bestSet(logs)).toEqual({ weight: 200, reps: 5 });
  });
  it('returns null when no positive-weight sets exist', () => {
    expect(bestSet([{ sets: [{ weight: 0, reps: 10 }] }])).toBeNull();
    expect(bestSet([])).toBeNull();
  });
});

describe('beatsBest', () => {
  it('any positive-weight set beats null history', () => {
    expect(beatsBest({ weight: 45, reps: 1 }, null)).toBe(true);
  });
  it('heavier weight wins; same weight more reps wins; otherwise no', () => {
    expect(beatsBest({ weight: 205, reps: 1 }, { weight: 200, reps: 5 })).toBe(true);
    expect(beatsBest({ weight: 200, reps: 6 }, { weight: 200, reps: 5 })).toBe(true);
    expect(beatsBest({ weight: 200, reps: 5 }, { weight: 200, reps: 5 })).toBe(false);
    expect(beatsBest({ weight: 195, reps: 12 }, { weight: 200, reps: 5 })).toBe(false);
  });
});

describe('startOfWeek', () => {
  it('returns the Monday of the week', () => {
    expect(startOfWeek('2026-07-11')).toBe('2026-07-06'); // Saturday -> Monday
    expect(startOfWeek('2026-07-06')).toBe('2026-07-06'); // Monday -> itself
    expect(startOfWeek('2026-07-12')).toBe('2026-07-06'); // Sunday -> previous Monday
  });
});
