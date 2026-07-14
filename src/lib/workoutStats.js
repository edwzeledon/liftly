// Pure workout math shared by PR detection, Insights aggregation, and the weekly review.
// Mirrors the best-set semantics of /api/workouts/history/best (max weight, ties by reps;
// all sets count, not just completed ones).

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
