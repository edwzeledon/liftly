'use client';
import { useEffect, useRef } from 'react';

// Escape-to-close, body scroll lock, and focus capture/restore for any overlay.
// onClose is ref-stabilized so effects key on [open] only (consumers pass inline arrows).
export function useModalBehavior(open, onClose) {
  const closeRef = useRef(null);
  const prevFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onCloseRef.current();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    prevFocusRef.current = document.activeElement;
    closeRef.current?.focus();
    return () => {
      const prev = prevFocusRef.current;
      if (prev && prev.isConnected && typeof prev.focus === 'function') prev.focus();
    };
  }, [open]);

  return { closeRef };
}
