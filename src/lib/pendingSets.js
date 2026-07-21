// Outbox for unsaved set edits. WorkoutCard writes an entry synchronously on
// every dirty state change and the debounced PUT clears it on success; entries
// that survive a crash/close are overlaid onto the next fetch and replayed.
const PREFIX = 'snapcal_pending_sets_';
const TEMP_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function pendingKey(logId) {
  return PREFIX + logId;
}

// Reconcile pending entries against freshly fetched active logs. Returns
// { logs, replays }: logs with surviving edits overlaid, plus the entries to
// re-PUT. Entries with no matching log (finished/deleted/prior-day) and
// unparseable entries are removed. Temp-id entries are left for the card that
// owns them, except abandoned ones older than a day.
export function applyPendingSets(logs, storage = localStorage) {
  const byId = new Map((logs || []).map((l) => [String(l.id), l]));
  const replays = [];
  const keys = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k && k.startsWith(PREFIX)) keys.push(k);
  }
  let mergedLogs = logs || [];
  keys.forEach((key) => {
    const id = key.slice(PREFIX.length);
    let entry = null;
    try {
      entry = JSON.parse(storage.getItem(key));
    } catch (e) {
      entry = null;
    }
    if (!entry || !Array.isArray(entry.sets)) {
      storage.removeItem(key);
      return;
    }
    if (id.startsWith('temp')) {
      if (!entry.ts || Date.now() - entry.ts > TEMP_MAX_AGE_MS) storage.removeItem(key);
      return;
    }
    if (!byId.has(id)) {
      storage.removeItem(key);
      return;
    }
    mergedLogs = mergedLogs.map((l) => (String(l.id) === id ? { ...l, sets: entry.sets } : l));
    replays.push({ id, sets: entry.sets });
  });
  return { logs: mergedLogs, replays };
}

// Fire-and-forget re-PUT of recovered entries; each success clears its entry.
export function replayPendingSets(replays, storage = localStorage) {
  (replays || []).forEach(({ id, sets }) => {
    fetch(`/api/workouts/logs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sets }),
    })
      .then((res) => {
        if (!res.ok) return;
        // Only clear the entry if it still holds exactly what we PUT — a
        // newer edit may have re-written it while the replay was in flight.
        try {
          const cur = JSON.parse(storage.getItem(pendingKey(id)));
          if (cur && JSON.stringify(cur.sets) === JSON.stringify(sets)) {
            storage.removeItem(pendingKey(id));
          }
        } catch (e) {
          // Unreadable entry — leave it; the next load's reconcile removes it.
        }
      })
      .catch(() => {});
  });
}
