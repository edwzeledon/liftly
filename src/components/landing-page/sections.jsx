'use client';

import { m, useReducedMotion } from 'framer-motion';
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

  return (
    <>
      <section id="features" className="max-w-7xl mx-auto px-6 py-20 md:py-28">
        <m.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={v.container}>
          <m.p variants={v.item} className="text-protein-text text-sm font-semibold uppercase tracking-widest mb-2">
            Built around the bar
          </m.p>
          <m.h2 variants={v.item} className="font-display font-bold uppercase text-3xl md:text-5xl text-foreground mb-6">
            Fuel that follows your training
          </m.h2>
        </m.div>
        {FEATURES.map(({ icon: Icon, tile, iconClass, stat, title, description }) => (
          <m.div key={title} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.4 }} variants={v.container}
            className="py-12 md:py-16 border-t border-border">
            <div className="flex-1">
              <m.div variants={v.item} className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${tile}`}>
                <Icon className={`w-5 h-5 ${iconClass}`} />
              </m.div>
              <m.p variants={v.item} className="font-display font-bold text-3xl text-foreground tabular-nums leading-none mb-1">{stat}</m.p>
              <m.h3 variants={v.item} className="font-display font-bold uppercase text-2xl md:text-3xl text-foreground mb-2">{title}</m.h3>
              <m.p variants={v.item} className="text-muted-foreground max-w-md">{description}</m.p>
            </div>
          </m.div>
        ))}
      </section>

      <section className="bg-card border-y border-border">
        <m.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.4 }} variants={v.container}
          className="max-w-7xl mx-auto px-6 py-16 flex flex-col md:flex-row items-center justify-between gap-6">
          <m.h2 variants={v.item} className="font-display font-bold uppercase text-3xl md:text-5xl text-foreground">
            Stop guessing. Start fueling.
          </m.h2>
          <m.button variants={v.item} onClick={onCtaClick}
            className="bg-training text-white font-bold rounded-xl px-8 py-4 min-h-11 transition-colors hover:bg-training/90 active:scale-95">
            Start training
          </m.button>
        </m.div>
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
