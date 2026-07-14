'use client';

import React, { useEffect, useRef, useState } from 'react';

const DURATION = 400; // ms, matches the brief's ≤400ms ease-out contract
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Animated numeral. Renders a plain span; the caller supplies typography via className.
// No-ops (jumps straight to the value, no tween) under prefers-reduced-motion. No external deps.
// The initial render is static (from === target on mount) so there is no jarring 0 -> N on load;
// the tween runs only when `value` changes afterward (e.g. logging food).
export default function CountUp({ value, className }) {
  const target = Number(value) || 0;
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target); // last value actually rendered (updated every frame)
  const fromRef = useRef(target); // where the next tween starts from
  const rafRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;

    // Reduced motion: jump to the value on the next frame (async keeps effects side-effect-clean).
    if (prefersReducedMotion()) {
      rafRef.current = requestAnimationFrame(() => {
        displayRef.current = target;
        setDisplay(target);
      });
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        fromRef.current = displayRef.current;
      };
    }

    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / DURATION, 1);
      const next = Math.round(from + (target - from) * easeOut(t));
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    // Interrupt-safe: a mid-tween value change must resume from what is on screen
    // (displayRef), not the interrupted tween's destination.
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = displayRef.current;
    };
  }, [target]);

  return <span className={className}>{display}</span>;
}
