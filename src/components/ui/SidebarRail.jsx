'use client';

// Aceternity UI sidebar (21st.dev), ported for Liftly: hover-expand rail.
// Desktop-only — Liftly's mobile chrome (header + bottom dock) lives in the
// app layout. The rail rests closed (4rem) and opens (16rem) while hovered
// or while any child holds keyboard focus. No persistence, no toggle.

import React, { createContext, useContext, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

const SidebarRailContext = createContext(null);

export function useSidebarRail() {
  const ctx = useContext(SidebarRailContext);
  if (!ctx) throw new Error('useSidebarRail must be used within <SidebarRail>');
  return ctx;
}

export function SidebarRail({ children, className }) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <SidebarRailContext.Provider value={{ open }}>
      <motion.div
        className={cn(
          'hidden md:flex flex-col h-full shrink-0 bg-card border-r border-border overflow-hidden px-2 py-4',
          className
        )}
        initial={false}
        animate={{ width: open ? '16rem' : '4rem' }}
        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 40 }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocusCapture={() => setOpen(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
        }}
      >
        {children}
      </motion.div>
    </SidebarRailContext.Provider>
  );
}

// Label that fades with the rail. Layout must NEVER depend on the label:
// it keeps its box (no display toggling — framer defers display flips to
// the end of the exit animation, which caused a post-settle reflow) and
// the rail's overflow-hidden clips it while closed.
export function SidebarRailLabel({ children, className }) {
  const { open } = useSidebarRail();
  return (
    <motion.span
      initial={false}
      animate={{ opacity: open ? 1 : 0 }}
      aria-hidden={!open}
      className={cn('whitespace-nowrap', className)}
    >
      {children}
    </motion.span>
  );
}
