'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Trophy, Beef, Brain } from 'lucide-react';
import { makeVariants } from './motionVariants';
import Logo from '../ui/Logo';

const FEATURES = [
  { icon: Trophy, tile: 'bg-training-soft', iconClass: 'text-training-text', stat: 'every PR',
    title: 'PR detection', description: 'Automatically flags new personal records the moment you log a set.' },
  { icon: Beef, tile: 'bg-protein-soft', iconClass: 'text-protein-text', stat: '2 taps',
    title: 'Quick protein', description: 'Log the protein sources you eat most in two taps, no typing required.' },
  { icon: Brain, tile: 'bg-ai-soft', iconClass: 'text-ai', stat: '1×/week',
    title: 'AI review', description: 'A once-a-week AI breakdown of how your fueling tracked with training.' },
];

export default function Sections({ onCtaClick }) {
  const reduce = useReducedMotion();
  const v = makeVariants(reduce);
  const cardStagger = { ...v.container, visible: { ...v.container.visible, transition: reduce ? {} : { staggerChildren: 0.08 } } };

  return (
    <>
      <section id="features" className="max-w-7xl mx-auto px-6 py-20 md:py-28">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={v.container}>
          <motion.p variants={v.item} className="text-protein-text text-sm font-semibold uppercase tracking-widest mb-2">
            Built around the bar
          </motion.p>
          <motion.h2 variants={v.item} className="font-display font-bold uppercase text-3xl md:text-4xl text-foreground mb-10">
            Fuel that follows your training
          </motion.h2>
        </motion.div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={cardStagger}
          className="grid sm:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, tile, iconClass, stat, title, description }) => (
            <motion.div key={title} variants={v.item} className="bg-card border border-border rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${tile}`}>
                <Icon className={`w-5 h-5 ${iconClass}`} />
              </div>
              <p className="font-display font-bold text-3xl text-foreground tabular-nums leading-none mb-1">{stat}</p>
              <h3 className="font-display font-bold text-lg text-foreground mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="bg-card border-y border-border">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.4 }} variants={v.container}
          className="max-w-7xl mx-auto px-6 py-16 flex flex-col md:flex-row items-center justify-between gap-6">
          <motion.h2 variants={v.item} className="font-display font-bold uppercase text-3xl md:text-4xl text-foreground">
            Stop guessing. Start fueling.
          </motion.h2>
          <motion.button variants={v.item} onClick={onCtaClick}
            className="bg-training text-white font-bold rounded-xl px-8 py-4 min-h-11 transition-colors hover:bg-training/90 active:scale-95">
            Start training
          </motion.button>
        </motion.div>
      </section>

      <footer className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground border-t border-border">
        <div className="flex items-center gap-2"><Logo size={28} /><span>© 2026 Liftly</span></div>
        <div className="flex items-center gap-6">
          <a href="/privacy" className="hover:text-foreground">Privacy</a>
          <a href="/terms" className="hover:text-foreground">Terms</a>
          {/* Scoped override, not the shared `text-faint` token (~30 other
              usages elsewhere, out of scope here): #71717A on this footer's
              #0B0B0F background is 4.06:1, under WCAG AA's 4.5:1 for
              normal-size text (Lighthouse a11y: color-contrast, found during
              RT5). #8a8a92 clears it at 5.7:1, staying visually close. */}
          <span className="text-[#8a8a92]">Photo: Sven Mieke / Unsplash</span>
        </div>
      </footer>
    </>
  );
}
