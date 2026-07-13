'use client';
import React from 'react';
import { motion, AnimatePresence, useReducedMotion, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';
import { useModalBehavior } from '@/hooks/useModalBehavior';

export default function Sheet({ open, onClose, title, children }) {
  // Framer Motion's `initial`/`animate`/`exit`/`transition` props are JS-driven
  // (Web Animations API), so the `motion-reduce:transition-none` Tailwind class
  // below has no effect on them — it only guards CSS `transition-*` properties.
  // Read the OS setting explicitly so reduced-motion truly drops the spring
  // slide-up and leaves only an opacity fade, per the redesign's motion spec.
  const prefersReducedMotion = useReducedMotion();
  // Escape-to-close, body scroll lock, and focus capture/restore — shared hook.
  const { closeRef } = useModalBehavior(open, onClose);
  // Swipe-to-dismiss is initiated only from the grab handle (below), not the
  // whole panel, so dragging never hijacks scroll inside the max-h panel body.
  const dragControls = useDragControls();

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
            drag={prefersReducedMotion ? false : 'y'}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(e, info) => { if (info.offset.y > 80 || info.velocity.y > 500) onClose(); }}
            className="relative w-full sm:max-w-lg bg-card rounded-t-3xl sm:rounded-2xl p-6 max-h-[85vh] overflow-y-auto motion-reduce:transition-none"
          >
            {/* Grab handle — the only drag initiator (mobile-only via sm:hidden).
                The transparent pt/pb enlarges the touch target while -mt-2/mb-2
                keep the visible pill at its original position; touch-none lets
                the pointer drive the drag instead of scrolling the body.
                w-24 mx-auto keeps the hit area centered and clear of the
                absolutely-positioned close X in the top-right corner. */}
            <div
              onPointerDown={(e) => { if (!prefersReducedMotion) dragControls.start(e); }}
              className="sm:hidden w-24 mx-auto flex justify-center -mt-2 pt-2 pb-2 mb-2 touch-none cursor-grab active:cursor-grabbing"
            >
              <div className="w-12 h-1.5 bg-muted rounded-full" />
            </div>
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
