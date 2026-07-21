import { pendingKey, applyPendingSets, replayPendingSets } from '../pendingSets';

const LOGS = () => [
  { id: 'log-1', exercise_name: 'Bench', sets: [{ weight: '135', reps: '8', completed: true }] },
  { id: 'log-2', exercise_name: 'Squat', sets: [{ weight: '225', reps: '5', completed: false }] },
];

const EDIT = [{ weight: '150', reps: '8', completed: true }];

describe('applyPendingSets', () => {
  beforeEach(() => localStorage.clear());

  it('overlays a matching entry onto its log and lists it for replay', () => {
    localStorage.setItem(pendingKey('log-1'), JSON.stringify({ sets: EDIT, ts: Date.now() }));
    const { logs, replays } = applyPendingSets(LOGS());
    expect(logs.find((l) => l.id === 'log-1').sets).toEqual(EDIT);
    expect(logs.find((l) => l.id === 'log-2').sets[0].weight).toBe('225');
    expect(replays).toEqual([{ id: 'log-1', sets: EDIT }]);
    expect(localStorage.getItem(pendingKey('log-1'))).not.toBeNull();
  });

  it('removes an entry with no matching log', () => {
    localStorage.setItem(pendingKey('log-gone'), JSON.stringify({ sets: EDIT, ts: Date.now() }));
    const { logs, replays } = applyPendingSets(LOGS());
    expect(replays).toEqual([]);
    expect(logs).toEqual(LOGS());
    expect(localStorage.getItem(pendingKey('log-gone'))).toBeNull();
  });

  it('leaves a fresh temp entry alone and never replays it', () => {
    localStorage.setItem(pendingKey('temp-123'), JSON.stringify({ sets: EDIT, ts: Date.now() }));
    const { replays } = applyPendingSets(LOGS());
    expect(replays).toEqual([]);
    expect(localStorage.getItem(pendingKey('temp-123'))).not.toBeNull();
  });

  it('reaps a temp entry older than 24h', () => {
    localStorage.setItem(pendingKey('temp-old'), JSON.stringify({ sets: EDIT, ts: Date.now() - 25 * 60 * 60 * 1000 }));
    applyPendingSets(LOGS());
    expect(localStorage.getItem(pendingKey('temp-old'))).toBeNull();
  });

  it('removes an unparseable entry', () => {
    localStorage.setItem(pendingKey('log-1'), '{not json');
    const { logs, replays } = applyPendingSets(LOGS());
    expect(replays).toEqual([]);
    expect(logs).toEqual(LOGS());
    expect(localStorage.getItem(pendingKey('log-1'))).toBeNull();
  });

  it('returns logs unchanged when no entries exist', () => {
    const { logs, replays } = applyPendingSets(LOGS());
    expect(logs).toEqual(LOGS());
    expect(replays).toEqual([]);
  });
});

describe('replayPendingSets', () => {
  beforeEach(() => localStorage.clear());

  it('PUTs each replay and clears its entry on success', async () => {
    localStorage.setItem(pendingKey('log-1'), JSON.stringify({ sets: EDIT, ts: Date.now() }));
    global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
    replayPendingSets([{ id: 'log-1', sets: EDIT }]);
    expect(global.fetch).toHaveBeenCalledWith('/api/workouts/logs/log-1', expect.objectContaining({ method: 'PUT' }));
    await Promise.resolve();
    await Promise.resolve();
    expect(localStorage.getItem(pendingKey('log-1'))).toBeNull();
  });

  it('does not clear an entry that was re-written while the replay was in flight', async () => {
    const NEWER = [{ weight: '200', reps: '3', completed: true }];
    localStorage.setItem(pendingKey('log-1'), JSON.stringify({ sets: EDIT, ts: Date.now() }));
    global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
    replayPendingSets([{ id: 'log-1', sets: EDIT }]);
    // A newer edit lands before the replay's response resolves:
    localStorage.setItem(pendingKey('log-1'), JSON.stringify({ sets: NEWER, ts: Date.now() }));
    await Promise.resolve();
    await Promise.resolve();
    const survivor = JSON.parse(localStorage.getItem(pendingKey('log-1')));
    expect(survivor.sets).toEqual(NEWER);
  });
});
