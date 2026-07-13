'use client';
import { useEffect, useRef } from 'react';

// Module-level registry of currently-open overlays, in open order.
// Fixes stacked-modal behavior (e.g. PlateCalculator over a WorkoutView modal,
// or ConfirmModal over the load-template list):
// - Escape only closes the TOPMOST overlay (one keypress, one close).
// - Body scroll lock is ref-counted: locked when the stack goes 0 -> 1,
//   restored only when the last overlay closes — an intermediate close no
//   longer unlocks scroll under a still-open modal.
const modalStack = [];

// Escape-to-close, body scroll lock, and focus capture/restore for any overlay.
// onClose is ref-stabilized so effects key on [open] only (consumers pass inline arrows).
export function useModalBehavior(open, onClose) {
  const closeRef = useRef(null);
  const prevFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  // Unique per-instance token identifying this overlay in the module stack.
  const tokenRef = useRef(null);
  if (tokenRef.current === null) tokenRef.current = {};

  useEffect(() => {
    if (!open) return;
    const token = tokenRef.current;
    modalStack.push(token);
    if (modalStack.length === 1) document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      // Only the topmost overlay responds; ones underneath stay open.
      if (modalStack[modalStack.length - 1] !== token) return;
      onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const i = modalStack.indexOf(token);
      if (i !== -1) modalStack.splice(i, 1);
      if (modalStack.length === 0) document.body.style.overflow = 'unset';
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
