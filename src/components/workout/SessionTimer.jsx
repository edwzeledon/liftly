'use client';
import React, { useEffect, useState } from 'react';

// Owns the 1s tick so the parent (and every WorkoutCard) doesn't re-render per second.
export default function SessionTimer({ startedAt, className = '' }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  // Deliberately impure: this is a live clock display whose whole point is to
  // read the current time each render; the interval above (not React state
  // derived from props) is what drives the re-render, so there's no
  // memoization/compiler hazard here.
  // eslint-disable-next-line react-hooks/purity
  const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return <span className={`tabular-nums ${className}`}>{m}:{String(s).padStart(2, '0')}</span>;
}
