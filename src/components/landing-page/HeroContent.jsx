'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { makeVariants } from './motionVariants';

export default function HeroContent({ onCtaClick, onSecondaryClick }) {
  const reduce = useReducedMotion();
  const v = makeVariants(reduce);
  return (
    <motion.div initial="hidden" animate="visible" exit={{ opacity: 0, y: reduce ? 0 : -16, transition: { duration: 0.15 } }}
      variants={v.container}
      className="relative z-10 flex h-full flex-col justify-end pb-24 md:justify-start md:pt-[20vh] md:pb-0 px-6 max-w-7xl mx-auto w-full">
      <div className="max-w-2xl">
        <motion.p variants={v.item} className="text-protein-text text-sm font-semibold uppercase tracking-widest mb-3">
          For lifters
        </motion.p>
        <motion.h1 variants={v.item}
          className="font-display font-bold uppercase leading-[0.95] text-5xl md:text-7xl text-foreground">
          Train hard.
          <br />
          <span className="text-protein">Fuel right.</span>
        </motion.h1>
        <motion.p variants={v.item} className="mt-4 text-lg text-muted-foreground max-w-md">
          The lifting app where nutrition serves your training. Log protein in two taps, see how fuel drives your PRs.
        </motion.p>
        <motion.div variants={v.item} className="mt-8 flex flex-wrap gap-4">
          <button onClick={onCtaClick}
            className="bg-training text-white font-bold rounded-xl px-6 py-3 min-h-11 transition-colors hover:bg-training/90 active:scale-95">
            Start training
          </button>
          <button onClick={onSecondaryClick}
            className="bg-card/60 backdrop-blur-sm border border-border text-foreground font-bold rounded-xl px-6 py-3 min-h-11 transition-colors hover:bg-card/80 active:scale-95">
            See how it works
          </button>
        </motion.div>
      </div>
      <motion.div variants={v.item} className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden md:block">
        <motion.div animate={reduce ? undefined : { y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}>
          <ChevronDown className="w-6 h-6 text-muted-foreground" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
