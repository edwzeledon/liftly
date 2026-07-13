'use client';

import React from 'react';
import { Trophy, Beef, Brain } from 'lucide-react';

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

// Task L2 stub: feature-strip markup carried verbatim from the old Hero.jsx.
// Task L4 rebuilds/restyles this section — do not restyle here.
export default function Sections({ onCtaClick }) {
  return (
    <section className="relative w-full bg-card text-foreground">
      {/* Feature strip */}
      <div id="features" className="max-w-7xl mx-auto px-6 pt-24 pb-24">
        <div className="grid sm:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, tile, iconClass, title, description }) => (
            <div key={title} className="bg-card border border-border rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${tile}`}>
                <Icon className={`w-5 h-5 ${iconClass}`} />
              </div>
              <h2 className="font-display font-bold text-lg text-foreground mb-1">{title}</h2>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
