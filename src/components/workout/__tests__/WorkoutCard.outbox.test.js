import { render, fireEvent, act } from '@testing-library/react';
import WorkoutCard from '../WorkoutCard';
import { pendingKey } from '@/lib/pendingSets';

jest.mock('canvas-confetti', () => jest.fn());

const baseLog = () => ({
  id: 'log-1',
  exercise_name: 'Bench Press',
  category: 'Chest',
  sets: [{ weight: '135', reps: '8', completed: false }],
});

let calls;
const putCalls = () => calls.filter((c) => c.opts && c.opts.method === 'PUT');

describe('WorkoutCard outbox', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    calls = [];
    global.fetch = jest.fn((url, opts) => {
      calls.push({ url, opts });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  });

  const renderCard = (props = {}) =>
    render(<WorkoutCard log={baseLog()} onDelete={jest.fn()} onUpdate={jest.fn()} weightUnit="lb" {...props} />);

  const editWeight = (container, value, { blur = true } = {}) => {
    const weightInput = container.querySelectorAll('input')[0];
    fireEvent.focus(weightInput);
    fireEvent.change(weightInput, { target: { value } });
    if (blur) fireEvent.blur(weightInput);
  };

  it('writes the outbox entry synchronously on edit, before any PUT', () => {
    const { container } = renderCard();
    editWeight(container, '150', { blur: false });
    const entry = JSON.parse(localStorage.getItem(pendingKey('log-1')));
    expect(entry.sets[0].weight).toBe('150');
    expect(putCalls().length).toBe(0);
  });

  it('syncs at 5s (not 2s) and clears the entry on confirmed save', async () => {
    const { container } = renderCard();
    editWeight(container, '150');
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(putCalls().length).toBe(0); // old 2s window must NOT fire
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(putCalls().length).toBe(1);
    await act(async () => {}); // flush the save's success microtasks
    expect(localStorage.getItem(pendingKey('log-1'))).toBeNull();
  });

  it('fires a best-effort keepalive PUT on pagehide when dirty', () => {
    const { container } = renderCard();
    editWeight(container, '155', { blur: false });
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    const puts = putCalls();
    expect(puts.length).toBe(1);
    expect(puts[0].opts.keepalive).toBe(true);
    expect(localStorage.getItem(pendingKey('log-1'))).not.toBeNull(); // entry stays until CONFIRMED
  });

  it('does nothing on pagehide when clean', () => {
    renderCard();
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(putCalls().length).toBe(0);
  });

  it('finishing cancels the armed sync and drops the entry', async () => {
    const { container, rerender } = renderCard();
    editWeight(container, '160');
    expect(localStorage.getItem(pendingKey('log-1'))).not.toBeNull();
    // In production, WorkoutView.handleUpdateLog mirrors every edit back into
    // the log prop synchronously (onUpdate), so by the time isFinishing flips
    // true the prop's .sets already matches the card's local state. Rerender
    // with that same edited shape rather than a fresh, unedited baseLog() —
    // a stale/reverted log prop here is not a case the real app produces, and
    // would just re-trigger the (untouched) prop-sync effect against stale data.
    const editedLog = { ...baseLog(), sets: [{ weight: '160', reps: '8', completed: false }] };
    rerender(<WorkoutCard log={editedLog} onDelete={jest.fn()} onUpdate={jest.fn()} weightUnit="lb" finishing={true} />);
    expect(localStorage.getItem(pendingKey('log-1'))).toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(6000);
    });
    expect(putCalls().length).toBe(0);
  });

  it('a surviving entry keeps the card dirty at mount (entry preserved)', () => {
    localStorage.setItem(pendingKey('log-1'), JSON.stringify({ sets: baseLog().sets, ts: Date.now() }));
    renderCard();
    expect(localStorage.getItem(pendingKey('log-1'))).not.toBeNull();
  });
});
