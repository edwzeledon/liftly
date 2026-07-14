// Pure aggregation joining nutrition (logs), training (workout_logs), and body (daily_stats).
import { logsVolume, beatsBest, startOfWeek } from './workoutStats';

export function dayKey(isoDate) {
  return String(isoDate).slice(0, 10);
}

/**
 * Select the current-week and previous-week buckets out of an aggregated
 * (ASC-by-weekStart) weeks array BY their week-start date, never by position.
 *
 * aggregateInsights only emits buckets for weeks that actually have data, so a
 * naive `[prev, this] = weeks` destructure is wrong: if the lifter logged last
 * week but nothing this week, the most-recent bucket is last week — it must NOT
 * be treated as "this week". Matching by weekStart handles lengths 0/1/2+
 * uniformly and yields zero-filled defaults for any week with no data.
 *
 * @param {Array<{weekStart:string}>} weeks - ASC by weekStart
 * @param {string} thisWeekStart - startOfWeek(today)
 * @param {string} prevWeekStart - startOfWeek(today - 7d)
 * @returns {{ thisWk:Object, prevWk:Object }}
 */
export function pickWeekPair(weeks, thisWeekStart, prevWeekStart) {
  const list = Array.isArray(weeks) ? weeks : [];
  const zero = (weekStart) => ({ weekStart, volume: 0, avgProtein: 0, avgCalories: 0, daysLogged: 0 });
  const find = (ws) => list.find((w) => w && w.weekStart === ws);
  return {
    thisWk: find(thisWeekStart) || zero(thisWeekStart),
    prevWk: find(prevWeekStart) || zero(prevWeekStart),
  };
}

export function aggregateInsights({ foodLogs = [], workoutLogs = [], dailyStats = [], dailyGoal = 2000, weeks = 4 }) {
  // Per-day nutrition totals
  const dayNutrition = {};
  foodLogs.forEach((l) => {
    const day = dayKey(l.date);
    if (!dayNutrition[day]) dayNutrition[day] = { calories: 0, protein: 0 };
    dayNutrition[day].calories += parseInt(l.calories) || 0;
    dayNutrition[day].protein += parseInt(l.protein) || 0;
  });

  // Weekly buckets
  const weekMap = {};
  const bucket = (day) => {
    const wk = startOfWeek(day);
    if (!weekMap[wk]) weekMap[wk] = { weekStart: wk, volume: 0, calories: 0, protein: 0, daysLogged: 0 };
    return weekMap[wk];
  };
  Object.entries(dayNutrition).forEach(([day, n]) => {
    const wk = bucket(day);
    wk.calories += n.calories;
    wk.protein += n.protein;
    wk.daysLogged += 1;
  });
  const byDay = {};
  workoutLogs.forEach((l) => {
    const day = dayKey(l.date);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(l);
  });
  Object.entries(byDay).forEach(([day, logs]) => {
    bucket(day).volume += logsVolume(logs);
  });

  const weekList = Object.values(weekMap)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .slice(-weeks)
    .map((w) => ({
      weekStart: w.weekStart,
      volume: Math.round(w.volume),
      avgProtein: w.daysLogged ? Math.round(w.protein / w.daysLogged) : 0,
      avgCalories: w.daysLogged ? Math.round(w.calories / w.daysLogged) : 0,
      daysLogged: w.daysLogged,
    }));

  // PR events: walk chronologically, track best per exercise
  const bestByExercise = {};
  const prEvents = [];
  [...workoutLogs]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .forEach((log) => {
      const sets = Array.isArray(log.sets) ? log.sets : [];
      sets.forEach((set) => {
        const best = bestByExercise[log.exercise_name] || null;
        if (beatsBest(set, best)) {
          bestByExercise[log.exercise_name] = {
            weight: parseFloat(set.weight) || 0,
            reps: parseFloat(set.reps) || 0,
          };
          const day = dayKey(log.date);
          const prev = new Date(day + 'T00:00:00');
          prev.setDate(prev.getDate() - 1);
          const prevDay = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`;
          prEvents.push({
            date: day,
            exercise: log.exercise_name,
            weight: bestByExercise[log.exercise_name].weight,
            reps: bestByExercise[log.exercise_name].reps,
            dayProtein: dayNutrition[day]?.protein ?? null,
            dayCalories: dayNutrition[day]?.calories ?? null,
            prevDayProtein: dayNutrition[prevDay]?.protein ?? null,
            prevDayCalories: dayNutrition[prevDay]?.calories ?? null,
          });
        }
      });
    });

  // Collapse multiple PRs on the same exercise+day to the final (best) one
  const dedup = {};
  prEvents.forEach((p) => { dedup[p.exercise + p.date] = p; });

  const weightSeries = dailyStats
    .filter((s) => s.weight != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({
      date: s.date,
      weight: parseFloat(s.weight),
      balance: dayNutrition[s.date] ? dayNutrition[s.date].calories - dailyGoal : 0,
    }));

  return {
    weeks: weekList,
    prEvents: Object.values(dedup).sort((a, b) => a.date.localeCompare(b.date)),
    weightSeries,
    foodDaysLogged: Object.keys(dayNutrition).length,
  };
}
