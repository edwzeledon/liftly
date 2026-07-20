// Rest-band heuristic v1: the muscle-group category is a proxy for compound
// vs isolation load (Legs/Back carry the heaviest compounds; Arms the
// shortest rests). Never shown to the user — it only drives the charging
// ring's fill rate.
const REST_BANDS = { Legs: 180, Back: 180, Arms: 60 };
export const DEFAULT_REST_BAND_SEC = 90;

export function restBandSec(category) {
  return REST_BANDS[category] ?? DEFAULT_REST_BAND_SEC;
}

// Timestamp-anchored (SessionTimer pattern): recomputable after tab
// backgrounding with no persisted running state.
export function restProgress(startedAt, bandSec, now = Date.now()) {
  const elapsedSec = Math.max(0, (now - startedAt) / 1000);
  const fraction = bandSec > 0 ? Math.min(1, elapsedSec / bandSec) : 1;
  return {
    fraction,
    ready: fraction >= 1,
    remainingSec: Math.max(0, Math.ceil(bandSec - elapsedSec)),
  };
}
