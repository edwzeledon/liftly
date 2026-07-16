import { setVolume, logsVolume, bestSet, beatsBest, startOfWeek, lastWorkoutSession, recentExercises } from '../workoutStats';

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
