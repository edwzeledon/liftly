'use client';

import { m, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { makeVariants } from './motionVariants';

// Poster hero: mobile keeps the bottom-anchored left-aligned block; md+ goes
// full cinematic — centered condensed display type at clamp poster scale.
export default function HeroContent({ onCtaClick, onSecondaryClick }) {
  const reduce = useReducedMotion();
  const v = makeVariants(reduce);
  return (
    <m.div initial="hidden" animate="visible" exit={{ opacity: 0, y: reduce ? 0 : -16, transition: { duration: 0.15 } }}
      variants={v.container}
      className="relative z-10 flex h-full flex-col justify-end pb-24 md:justify-center md:items-center md:pb-0 md:text-center px-6 max-w-7xl mx-auto w-full">
      <div className="max-w-2xl md:max-w-none">
        <m.p variants={v.item} className="text-protein-text text-sm font-semibold uppercase tracking-widest mb-3">
          For lifters
        </m.p>
        <m.h1 variants={v.item}
          className="font-display font-bold uppercase leading-[0.92] text-5xl md:text-[clamp(5.5rem,10vw,10rem)] text-foreground">
          Train hard.
          <br />
          <span className="text-protein">Fuel right.</span>
        </m.h1>
        <m.p variants={v.item} className="mt-4 text-lg text-muted-foreground max-w-md md:mx-auto">
          The lifting app where nutrition serves your training. Log protein in two taps, see how fuel drives your PRs.
        </m.p>
        <m.div variants={v.item} className="mt-8 flex flex-wrap gap-4 md:justify-center">
          <button onClick={onCtaClick}
            className="bg-training text-background font-bold rounded-xl px-6 py-3 min-h-11 transition-colors hover:bg-training/90 active:scale-95">
            Start training
          </button>
          <button onClick={onSecondaryClick}
            className="bg-card/60 backdrop-blur-sm border border-border text-foreground font-bold rounded-xl px-6 py-3 min-h-11 transition-colors hover:bg-card/80 active:scale-95">
            See how it works
          </button>
        </m.div>
      </div>
      <m.div variants={v.item} className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden md:block">
        <m.div animate={reduce ? undefined : { y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}>
          <ChevronDown className="w-6 h-6 text-muted-foreground" />
        </m.div>
      </m.div>
    </m.div>
  );
}
