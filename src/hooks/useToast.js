'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Toast from '@/components/ui/Toast';
import React from 'react';

// One active toast per host. onCommit fires exactly once when the toast leaves
// WITHOUT its action being taken (expiry / dismiss / superseded / host unmount).
// The action (e.g. Undo) cancels onCommit. Error toasts omit onCommit.
export function useToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);
  const commitRef = useRef(null); // pending onCommit for the CURRENT toast

  const settle = useCallback((runCommit) => {
    clearTimeout(timerRef.current);
    const commit = commitRef.current;
    commitRef.current = null;
    if (runCommit && commit) commit();
  }, []);

  const dismissToast = useCallback(() => {
    settle(true);
    setToast(null);
  }, [settle]);

  const showToast = useCallback(({ message, variant = 'default', action, onCommit, duration = 5000 }) => {
    settle(true); // supersede: commit the previous toast first
    commitRef.current = onCommit || null;
    const wrappedAction = action
      ? {
          label: action.label,
          onAction: () => {
            settle(false); // action cancels commit
            setToast(null);
            action.onAction();
          },
        }
      : null;
    setToast({ message, variant, action: wrappedAction });
    timerRef.current = setTimeout(() => {
      settle(true);
      setToast(null);
    }, duration);
  }, [settle]);

  // Unmount flush: a pending delete must not be lost.
  useEffect(() => () => settle(true), [settle]);

  // Memoized so hosts (e.g. AppProvider's context value) don't see a fresh
  // element identity on renders where the toast state didn't change.
  // eslint-disable-next-line react-hooks/refs -- false positive: Toast receives the `toast` state value and a stable callback; no ref .current is read during render here.
  const toastEl = useMemo(() => React.createElement(Toast, { toast, onDismiss: dismissToast }), [toast, dismissToast]);

  return { toast, toastEl, showToast, dismissToast };
}
