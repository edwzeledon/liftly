'use client';
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

export default function Sheet({ open, onClose, title, children }) {
  // Framer Motion's `initial`/`animate`/`exit`/`transition` props are JS-driven
  // (Web Animations API), so the `motion-reduce:transition-none` Tailwind class
  // below has no effect on them — it only guards CSS `transition-*` properties.
  // Read the OS setting explicitly so reduced-motion truly drops the spring
  // slide-up and leaves only an opacity fade, per the redesign's motion spec.
  const prefersReducedMotion = useReducedMotion();
  const closeRef = useRef(null);
  const prevFocusRef = useRef(null);
  // Keep the latest onClose in a ref so the effects below key on [open] only —
  // consumers pass inline arrows, and re-running these effects on every parent
  // re-render would yank focus out of the open dialog.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Escape-to-close + body scroll lock.
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

  // Focus management: capture the previously-focused element, move focus into
  // the sheet (the close button is a safe, always-present target), and restore
  // it on close — only if the captured element is still in the document.
  useEffect(() => {
    if (!open) return;
    prevFocusRef.current = document.activeElement;
    closeRef.current?.focus();
    return () => {
      const prev = prevFocusRef.current;
      if (prev && prev.isConnected && typeof prev.focus === 'function') {
        prev.focus();
      }
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog" aria-modal="true" aria-label={title}
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: prefersReducedMotion ? 0 : 100 }}
            transition={prefersReducedMotion ? { duration: 0.15 } : { type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full sm:max-w-lg bg-card rounded-t-3xl sm:rounded-2xl p-6 max-h-[85vh] overflow-y-auto motion-reduce:transition-none"
          >
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4 sm:hidden" />
            <button ref={closeRef} onClick={onClose} aria-label="Close"
              className="absolute top-4 right-4 p-2 bg-muted rounded-full text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
            {title && <h3 className="font-display text-xl font-bold text-foreground mb-4">{title}</h3>}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
