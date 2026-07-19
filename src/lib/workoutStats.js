// Pure workout math shared by PR detection, Insights aggregation, and the weekly review.
// Mirrors the best-set semantics of /api/workouts/history/best (max weight, ties by reps;
// all sets count, not just completed ones).

import { dayVolumeLb, dayDurationSec } from './daySummary';

export function setVolume(set) {
  if (!set) return 0;
  const weight = parseFloat(set.weight) || 0;
  const reps = parseFloat(set.reps) || 0;
  return weight * reps;
}

export function logsVolume(workoutLogs) {
  if (!Array.isArray(workoutLogs)) return 0;
  return workoutLogs.reduce((total, log) => {
    if (!log || !Array.isArray(log.sets)) return total;
    return total + log.sets.reduce((s, set) => s + setVolume(set), 0);
  }, 0);
}

export function bestSet(workoutLogs) {
  let best = { weight: 0, reps: 0 };
  (workoutLogs || []).forEach((log) => {
    if (!log || !Array.isArray(log.sets)) return;
    log.sets.forEach((set) => {
      const weight = parseFloat(set.weight) || 0;
      const reps = parseFloat(set.reps) || 0;
      if (weight > best.weight || (weight === best.weight && reps > best.reps)) {
        best = { weight, reps };
      }
    });
  });
  return best.weight > 0 ? best : null;
}

export function beatsBest(set, best) {
  const weight = parseFloat(set?.weight) || 0;
  const reps = parseFloat(set?.reps) || 0;
  if (weight <= 0) return false;
  if (!best) return true;
  return weight > best.weight || (weight === best.weight && reps > best.reps);
}

export function startOfWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const mondayOffset = (d.getDay() + 6) % 7; // Mon=0 ... Sun=6
  d.setDate(d.getDate() - mondayOffset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Most recent completed (non-today) training day, shaped for the launchpad's
// "Repeat last" card. exercises[] is template-shaped so handleLoadTemplate can
// consume it directly: set COUNT carries over, weights stay blank (history
// prefill happens inside the template-load path).
export function lastWorkoutSession(workoutLogs, now = new Date()) {
  const todayKey = now.toDateString();
  const groups = new Map();
  (workoutLogs || []).forEach((log) => {
    if (!log || !log.date) return;
    const d = new Date(log.date);
    const key = d.toDateString();
    if (key === todayKey) return;
    if (!groups.has(key)) groups.set(key, { date: d, logs: [] });
    groups.get(key).logs.push(log);
  });
  if (groups.size === 0) return null;

  const latest = [...groups.values()].sort((a, b) => b.date - a.date)[0];

  const seen = new Set();
  const exercises = [];
  latest.logs.forEach((log) => {
    const name = log.exercise || log.exercise_name;
    if (!name || seen.has(name)) return;
    seen.add(name);
    const setCount = Math.max(1, (log.sets || []).length);
    exercises.push({
      exercise: name,
      category: log.category,
      sets: Array.from({ length: setCount }, () => ({ weight: '', reps: '', completed: false })),
    });
  });
  if (exercises.length === 0) return null;

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const daysAgo = Math.round((startOfDay(now) - startOfDay(latest.date)) / 86400000);
  const dateLabel =
    daysAgo === 1 ? 'Yesterday'
      : daysAgo < 7 ? `${daysAgo} days ago`
        : latest.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

  return {
    dateLabel,
    exercises,
    volumeLb: dayVolumeLb(latest.logs),
    durationSec: dayDurationSec(latest.logs),
    exerciseCount: exercises.length,
  };
}

// Unique exercises from history, most recently used first — feeds the
// picker's Recent chips. Name resolution matches the rest of the app:
// exercise || exercise_name.
export function recentExercises(workoutLogs, limit = 8) {
  const sorted = [...(workoutLogs || [])]
    .filter((l) => l && (l.exercise || l.exercise_name) && l.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const seen = new Set();
  const out = [];
  for (const log of sorted) {
    const name = log.exercise || log.exercise_name;
    if (seen.has(name)) continue;
    seen.add(name);
    out.push({ name, category: log.category });
    if (out.length >= limit) break;
  }
  return out;
}

// Sets logged today that beat the lifter's best prior set for that exercise.
// Returns the single best beating set per exercise (canonical-lb numbers);
// a first-ever exercise counts as a PR (beatsBest treats null best as beaten).
export function prsToday(workoutLogs, now = new Date()) {
  const todayKey = now.toDateString();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const logs = (workoutLogs || []).filter((l) => l && l.date && Array.isArray(l.sets));
  const prior = logs.filter((l) => new Date(l.date) < startOfToday);
  const todays = logs.filter((l) => new Date(l.date).toDateString() === todayKey);

  const byExercise = new Map();
  todays.forEach((log) => {
    const name = log.exercise || log.exercise_name;
    if (!name) return;
    if (!byExercise.has(name)) byExercise.set(name, []);
    byExercise.get(name).push(log);
  });

  const prs = [];
  byExercise.forEach((exLogs, name) => {
    const best = bestSet(prior.filter((p) => (p.exercise || p.exercise_name) === name));
    let top = null;
    exLogs.forEach((log) =>
      log.sets.forEach((set) => {
        if (beatsBest(set, best) && beatsBest(set, top)) {
          top = { weight: parseFloat(set.weight) || 0, reps: parseFloat(set.reps) || 0 };
        }
      })
    );
    if (top) prs.push({ exercise: name, weight: top.weight, reps: top.reps });
  });
  return prs;
}

// Most recent day's best completed set for one exercise (canonical lb).
// Feeds the WorkoutCard "Last: W×R" reference line.
export function lastSetFor(exerciseName, workoutLogs) {
  if (!exerciseName) return null;
  const mine = (workoutLogs || []).filter(
    (l) => l && (l.exercise_name || l.exercise) === exerciseName && Array.isArray(l.sets)
  );
  if (mine.length === 0) return null;
  let latest = null;
  mine.forEach((l) => {
    const d = new Date(l.date);
    if (!latest || d > latest) latest = d;
  });
  const dayLogs = mine
    .filter((l) => new Date(l.date).toDateString() === latest.toDateString())
    .map((l) => ({ ...l, sets: l.sets.filter((s) => s.completed) }))
    .filter((l) => l.sets.length > 0);
  const best = bestSet(dayLogs);
  if (!best) return null;
  return { weight: parseFloat(best.weight) || 0, reps: parseFloat(best.reps) || 0 };
}
