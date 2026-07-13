'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Beef, Brain } from 'lucide-react';
import DeviceFrame from './DeviceFrame';

const FEATURES = [
  {
    icon: Trophy,
    tile: 'bg-training-soft',
    iconClass: 'text-training-text',
    title: 'PR detection',
    description: 'Automatically flags new personal records the moment you log a set.',
  },
  {
    icon: Beef,
    tile: 'bg-protein-soft',
    iconClass: 'text-protein-text',
    title: '2-tap protein',
    description: 'Log the protein sources you eat most in two taps, no typing required.',
  },
  {
    icon: Brain,
    tile: 'bg-ai-soft',
    iconClass: 'text-ai',
    title: 'Weekly AI review',
    description: 'A once-a-week AI breakdown of how your fueling tracked with training.',
  },
];

// Animation variants for the container to orchestrate children animations
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
};

// Animation variants for individual text/UI elements
const itemVariants = {
  hidden: { y: 16, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: 'easeInOut',
    },
  },
};

const HeroSection = React.forwardRef(({ onCtaClick, onSecondaryClick, children }, ref) => {
  return (
    <section ref={ref} className="relative w-full bg-card text-foreground">
      <div className="max-w-7xl mx-auto px-6 pt-28 pb-20 md:pt-40 md:pb-28 grid md:grid-cols-2 gap-12 md:gap-8 items-center min-h-screen">
        {/* Left: headline / CTA, swapped for the auth screen when active */}
        <div className="w-full max-w-lg mx-auto md:mx-0 text-center md:text-left">
          {children ? (
            <motion.div
              key="auth-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full flex justify-center md:justify-start"
            >
              {children}
            </motion.div>
          ) : (
            <motion.div
              key="hero-content"
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              <motion.h1
                variants={itemVariants}
                className="font-display font-bold uppercase leading-[0.95] text-5xl md:text-7xl text-foreground"
              >
                Train hard.
                <br />
                <span className="text-protein">Fuel right.</span>
              </motion.h1>
              <motion.p
                variants={itemVariants}
                className="mt-4 text-lg text-muted-foreground max-w-md mx-auto md:mx-0"
              >
                The lifting app where nutrition serves your training. Log protein in two taps, see how fuel drives your PRs.
              </motion.p>
              <motion.div
                variants={itemVariants}
                className="mt-8 flex flex-wrap justify-center md:justify-start gap-4"
              >
                <button
                  onClick={onCtaClick}
                  className="bg-training text-white font-bold rounded-xl px-6 py-3 transition-colors hover:bg-training/90"
                >
                  Start training
                </button>
                <button
                  onClick={onSecondaryClick}
                  className="bg-muted text-foreground font-bold rounded-xl px-6 py-3 transition-colors hover:bg-muted/80"
                >
                  See how it works
                </button>
              </motion.div>
            </motion.div>
          )}
        </div>

        {/* Right: static product hero art */}
        <motion.div
          className="flex justify-center mt-4 md:mt-0"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeInOut', delay: 0.1 }}
        >
          <DeviceFrame />
        </motion.div>
      </div>

      {/* Feature strip */}
      <div id="features" className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid sm:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, tile, iconClass, title, description }) => (
            <div key={title} className="bg-card border border-border rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${tile}`}>
                <Icon className={`w-5 h-5 ${iconClass}`} />
              </div>
              <h3 className="font-display font-bold text-lg text-foreground mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

HeroSection.displayName = 'HeroSection';

export { HeroSection };
