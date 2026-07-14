'use client';
import { useCallback, useState } from 'react';

// Session-scoped draft persistence: survives tab navigation and refresh,
// dies with the browser tab. Write-through on every set; storage failures
// (quota, disabled) degrade to in-memory state silently.
export function useSessionDraft(key, initialState) {
  const [state, setState] = useState(() => {
    if (typeof window === 'undefined') return initialState;
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialState;
    } catch {
      return initialState;
    }
  });

  const set = useCallback((next) => {
    setState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      try {
        sessionStorage.setItem(key, JSON.stringify(value));
      } catch { /* quota/disabled: keep in-memory */ }
      return value;
    });
  }, [key]);

  const clearDraft = useCallback(() => {
    try { sessionStorage.removeItem(key); } catch { /* ignore */ }
    setState(initialState);
    // initialState is intentionally captured from first render (draft semantics)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [state, set, clearDraft];
}
