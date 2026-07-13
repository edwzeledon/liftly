'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Toast({ toast, onDismiss }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          role="status" aria-live="polite"
          className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md border text-sm rounded-xl px-4 py-3 flex items-center justify-between z-50 ${
            toast.variant === 'error'
              ? 'bg-destructive/15 border-destructive/30 text-foreground'
              : 'bg-muted border-border text-foreground'
          }`}
        >
          <span>{toast.message}</span>
          {toast.action && (
            <button onClick={toast.action.onAction} className="font-bold text-protein-text ml-3 min-h-11 px-2">
              {toast.action.label}
            </button>
          )}
          <button onClick={onDismiss} aria-label="Dismiss" className="ml-3 text-muted-foreground min-h-11 min-w-11 flex items-center justify-center -mr-2">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
