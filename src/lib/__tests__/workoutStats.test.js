import { setVolume, logsVolume, bestSet, beatsBest, startOfWeek, lastWorkoutSession, recentExercises, prsToday, lastSetFor } from '../workoutStats';

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

describe('lastWorkoutSession', () => {
  const now = new Date('2026-07-15T12:00:00');

  it('returns null for empty input and today-only history', () => {
    expect(lastWorkoutSession([], now)).toBeNull();
    expect(lastWorkoutSession(undefined, now)).toBeNull();
    expect(lastWorkoutSession([
      { id: 1, date: '2026-07-15T08:00:00', exercise: 'Bench', sets: [] },
    ], now)).toBeNull();
  });

  it('picks the most recent non-today day, blanks the sets, sums completed volume', () => {
    const logs = [
      { id: 1, date: '2026-07-10T08:00:00', exercise: 'Squat', category: 'Legs', session_id: 'a', duration: 3000, sets: [{ weight: '225', reps: '5', completed: true }] },
      { id: 2, date: '2026-07-14T08:00:00', exercise: 'Bench Press', category: 'Chest', session_id: 'b', duration: 3120, sets: [{ weight: '135', reps: '8', completed: true }, { weight: '135', reps: '8', completed: false }] },
    ];
    const s = lastWorkoutSession(logs, now);
    expect(s.dateLabel).toBe('Yesterday');
    expect(s.exerciseCount).toBe(1);
    expect(s.exercises).toEqual([
      { exercise: 'Bench Press', category: 'Chest', sets: [
        { weight: '', reps: '', completed: false },
        { weight: '', reps: '', completed: false },
      ] },
    ]);
    expect(s.volumeLb).toBe(1080);
    expect(s.durationSec).toBe(3120);
  });

  it('dedups exercises in insertion order, dedups session duration, floors zero-set logs to one blank set', () => {
    const logs = [
      { id: 1, date: '2026-07-13T08:00:00', exercise: 'Row', category: 'Back', session_id: 's', duration: 2400, sets: [{ weight: '95', reps: '10', completed: true }] },
      { id: 2, date: '2026-07-13T08:20:00', exercise_name: 'Curl', category: 'Arms', session_id: 's', duration: 2400, sets: [] },
      { id: 3, date: '2026-07-13T08:40:00', exercise: 'Row', category: 'Back', session_id: 's', duration: 2400, sets: [{ weight: '105', reps: '8', completed: true }] },
    ];
    const s = lastWorkoutSession(logs, now);
    expect(s.dateLabel).toBe('2 days ago');
    expect(s.exercises.map(e => e.exercise)).toEqual(['Row', 'Curl']);
    expect(s.exercises[0].sets).toHaveLength(1);
    expect(s.exercises[1].sets).toHaveLength(1);
    expect(s.durationSec).toBe(2400);
    expect(s.volumeLb).toBe(1790);
  });
});

describe('recentExercises', () => {
  it('handles empty and undefined input', () => {
    expect(recentExercises([])).toEqual([]);
    expect(recentExercises(undefined)).toEqual([]);
  });

  it('dedups by name, most recent first, resolves exercise_name', () => {
    const logs = [
      { date: '2026-07-10T08:00:00', exercise: 'Squat', category: 'Legs' },
      { date: '2026-07-14T08:00:00', exercise: 'Bench Press', category: 'Chest' },
      { date: '2026-07-12T08:00:00', exercise_name: 'Squat', category: 'Legs' },
    ];
    expect(recentExercises(logs)).toEqual([
      { name: 'Bench Press', category: 'Chest' },
      { name: 'Squat', category: 'Legs' },
    ]);
  });

  it('respects the limit', () => {
    const logs = Array.from({ length: 12 }, (_, i) => ({
      date: `2026-07-${String(i + 1).padStart(2, '0')}T08:00:00`,
      exercise: `Ex${i}`,
      category: 'Misc',
    }));
    expect(recentExercises(logs, 5)).toHaveLength(5);
    expect(recentExercises(logs, 5)[0].name).toBe('Ex11');
  });
});

describe('prsToday', () => {
  const NOW = new Date('2026-07-17T18:00:00');
  const today = '2026-07-17T15:00:00';
  const past = '2026-07-10T15:00:00';

  test('first-ever log for an exercise counts as a PR', () => {
    const logs = [{ exercise: 'Bench Press', date: today, sets: [{ weight: 135, reps: 5 }] }];
    expect(prsToday(logs, NOW)).toEqual([{ exercise: 'Bench Press', weight: 135, reps: 5 }]);
  });

  test('reports the best beating set when today beats a prior best', () => {
    const logs = [
      { exercise: 'Squat', date: past, sets: [{ weight: 225, reps: 5 }] },
      { exercise: 'Squat', date: today, sets: [{ weight: 230, reps: 3 }, { weight: 245, reps: 2 }] },
    ];
    expect(prsToday(logs, NOW)).toEqual([{ exercise: 'Squat', weight: 245, reps: 2 }]);
  });

  test('empty when today does not beat the prior best', () => {
    const logs = [
      { exercise: 'Deadlift', date: past, sets: [{ weight: 315, reps: 5 }] },
      { exercise: 'Deadlift', date: today, sets: [{ weight: 275, reps: 8 }] },
    ];
    expect(prsToday(logs, NOW)).toEqual([]);
  });

  test('ignores non-today logs, empty and null input', () => {
    const logs = [{ exercise: 'Row', date: past, sets: [{ weight: 185, reps: 8 }] }];
    expect(prsToday(logs, NOW)).toEqual([]);
    expect(prsToday([], NOW)).toEqual([]);
    expect(prsToday(null, NOW)).toEqual([]);
  });
});

describe('lastSetFor', () => {
  const logs = [
    { id: 1, date: '2026-07-10T08:00:00', exercise: 'Squat', category: 'Legs', sets: [{ weight: '225', reps: '5', completed: true }] },
    { id: 2, date: '2026-07-15T08:00:00', exercise: 'Squat', category: 'Legs', sets: [{ weight: '235', reps: '3', completed: true }, { weight: '245', reps: '1', completed: true }] },
    { id: 3, date: '2026-07-14T08:00:00', exercise_name: 'Curl', category: 'Arms', sets: [{ weight: '35', reps: '12', completed: true }] },
  ];
  it('returns the most recent day\'s best set for the exercise', () => {
    expect(lastSetFor('Squat', logs)).toEqual({ weight: 245, reps: 1 });
  });
  it('matches the exercise_name field variant', () => {
    expect(lastSetFor('Curl', logs)).toEqual({ weight: 35, reps: 12 });
  });
  it('returns null for an exercise with no history', () => {
    expect(lastSetFor('Deadlift', logs)).toBeNull();
  });
  it('returns null for empty inputs', () => {
    expect(lastSetFor('Squat', [])).toBeNull();
    expect(lastSetFor('', logs)).toBeNull();
  });
  it('ignores logs whose sets have no completed entries', () => {
    const only = [{ id: 9, date: '2026-07-16T08:00:00', exercise: 'Row', sets: [{ weight: '95', reps: '10', completed: false }] }];
    expect(lastSetFor('Row', only)).toBeNull();
  });
  it('never reports an entered-but-uncompleted set (mixed log)', () => {
    const mixed = [{
      id: 7, date: '2026-07-17T08:00:00', exercise: 'Bench Press',
      sets: [
        { weight: '135', reps: '8', completed: true },
        { weight: '225', reps: '1', completed: false },
      ],
    }];
    expect(lastSetFor('Bench Press', mixed)).toEqual({ weight: 135, reps: 8 });
  });
});
