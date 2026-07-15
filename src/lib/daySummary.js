// Day-level rollups for History's unified day card. Volume stays in the
// canonical lb domain — display conversion happens at render via units.js.

export function dayVolumeLb(workoutDayLogs) {
  let total = 0;
  (workoutDayLogs || []).forEach((log) => {
    (log.sets || []).forEach((s) => {
      if (!s || !s.completed) return;
      const w = parseFloat(s.weight);
      const r = parseFloat(s.reps);
      if (Number.isFinite(w) && Number.isFinite(r)) total += w * r;
    });
  });
  return total;
}

export function dayDurationSec(workoutDayLogs) {
  const seen = new Set();
  let total = 0;
  (workoutDayLogs || []).forEach((log) => {
    if (!log) return;
    const key = log.session_id ?? log.id;
    if (seen.has(key)) return;
    seen.add(key);
    const d = parseInt(log.duration, 10);
    if (Number.isFinite(d) && d > 0) total += d;
  });
  return total;
}

export function macroSplit(mealDayLogs) {
  let p = 0, c = 0, f = 0;
  (mealDayLogs || []).forEach((log) => {
    p += (parseFloat(log?.protein) || 0) * 4;
    c += (parseFloat(log?.carbs) || 0) * 4;
    f += (parseFloat(log?.fats) || 0) * 9;
  });
  const total = p + c + f;
  if (total <= 0) return null;

  // Largest-remainder rounding: floors first, then hand out the leftover
  // points to the largest fractional parts so shares sum to exactly 100.
  const raw = [(p / total) * 100, (c / total) * 100, (f / total) * 100];
  const floors = raw.map(Math.floor);
  const remainder = 100 - floors.reduce((a, b) => a + b, 0);
  const byFrac = raw
    .map((v, i) => ({ i, frac: v - floors[i] }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < remainder; k++) floors[byFrac[k].i] += 1;

  return { p: floors[0], c: floors[1], f: floors[2] };
}
