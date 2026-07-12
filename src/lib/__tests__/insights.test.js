import { aggregateInsights, dayKey } from '../insights';

const food = (date, calories, protein) => ({ date: date + 'T12:00:00.000Z', calories, protein });
const lift = (date, exercise_name, sets) => ({ date: date + 'T17:00:00.000Z', exercise_name, sets });

describe('dayKey', () => {
  it('extracts YYYY-MM-DD from an ISO timestamp', () => {
    expect(dayKey('2026-07-08T17:00:00.000Z')).toBe('2026-07-08');
  });
});

describe('aggregateInsights', () => {
  const foodLogs = [
    food('2026-07-06', 2200, 150), food('2026-07-07', 1900, 120),
    food('2026-07-08', 2400, 160),
  ];
  const workoutLogs = [
    lift('2026-07-06', 'Bench Press', [{ weight: 185, reps: 5 }]),
    lift('2026-07-08', 'Bench Press', [{ weight: 205, reps: 5 }]), // PR vs the 6th
  ];
  const dailyStats = [
    { date: '2026-07-06', weight: 180 }, { date: '2026-07-08', weight: 179.4 },
  ];

  const result = aggregateInsights({ foodLogs, workoutLogs, dailyStats, dailyGoal: 2000, weeks: 4 });

  it('buckets weekly volume and nutrition averages', () => {
    const wk = result.weeks.find((w) => w.weekStart === '2026-07-06');
    expect(wk.volume).toBe(185 * 5 + 205 * 5);
    expect(wk.avgProtein).toBe(Math.round((150 + 120 + 160) / 3));
    expect(wk.avgCalories).toBe(Math.round((2200 + 1900 + 2400) / 3));
    expect(wk.daysLogged).toBe(3);
  });

  it('detects PR events with surrounding nutrition', () => {
    expect(result.prEvents).toHaveLength(2); // first-ever set is also a PR
    const pr = result.prEvents.find((p) => p.date === '2026-07-08');
    expect(pr).toMatchObject({
      exercise: 'Bench Press', weight: 205, reps: 5,
      dayProtein: 160, dayCalories: 2400,
      prevDayProtein: 120, prevDayCalories: 1900,
    });
  });

  it('builds a weight series with goal-relative balance', () => {
    expect(result.weightSeries).toEqual([
      { date: '2026-07-06', weight: 180, balance: 200 },
      { date: '2026-07-08', weight: 179.4, balance: 400 },
    ]);
  });

  it('counts distinct food-logged days', () => {
    expect(result.foodDaysLogged).toBe(3);
  });
});
