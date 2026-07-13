'use client';
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Sheet({ open, onClose, title, children }) {
  const closeRef = useRef(null);
  const prevFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    // Remember the element focused before the sheet opened, then move focus
    // into the sheet (the close button is a safe, always-present target).
    prevFocusRef.current = document.activeElement;
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = 'unset';
      // Return focus to whatever had it before the sheet opened.
      if (prevFocusRef.current && typeof prevFocusRef.current.focus === 'function') {
        prevFocusRef.current.focus();
      }
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog" aria-modal="true" aria-label={title}
            initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
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
