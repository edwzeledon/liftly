'use client';

// Scrolling word strip between the hero and features — decorative fold
// divider (aria-hidden). Two identical halves translate -50% for a seamless
// loop; renders static under reduced motion. LazyMotion strict: import `m`,
// never `motion`.
import { useRef } from 'react';
import { m, useReducedMotion, useInView } from 'framer-motion';

const WORDS = ['Train', 'Fuel', 'PR'];
const REPEATS = 4;

function Half() {
  return (
    <span className="flex shrink-0 items-baseline">
      {Array.from({ length: REPEATS }, (_, i) =>
        WORDS.map((word) => (
          <span key={`${i}-${word}`} className="flex items-baseline">
            <span className={word === 'PR' ? 'text-protein-text/40' : 'text-foreground/15'}>{word}</span>
            <span className="text-faint text-2xl mx-4">·</span>
          </span>
        ))
      )}
    </span>
  );
}

export default function Marquee() {
  const reduce = useReducedMotion();
  const stripRef = useRef(null);
  // Pause the infinite tween while scrolled out of view — the restart-from-0%
  // on re-entry is invisible (both halves are identical and it happens
  // off-screen).
  const inView = useInView(stripRef);
  return (
    <div ref={stripRef} aria-hidden="true" className="border-y border-border py-5 overflow-hidden select-none">
      <m.div
        className="flex w-max whitespace-nowrap font-display font-bold uppercase text-4xl md:text-5xl"
        animate={reduce || !inView ? undefined : { x: ['0%', '-50%'] }}
        transition={{ repeat: Infinity, ease: 'linear', duration: 24 }}
      >
        <Half />
        <Half />
      </m.div>
    </div>
  );
}
