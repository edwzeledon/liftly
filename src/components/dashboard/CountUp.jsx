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
  const fromRef = useRef(target);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;

    // Reduced motion: jump to the value on the next frame (async keeps effects side-effect-clean).
    if (prefersReducedMotion()) {
      fromRef.current = target;
      rafRef.current = requestAnimationFrame(() => setDisplay(target));
      return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }

    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / DURATION, 1);
      setDisplay(Math.round(from + (target - from) * easeOut(t)));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
  }, [target]);

  return <span className={className}>{display}</span>;
}
