'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Dumbbell, Beef, Trophy, Target, X } from 'lucide-react';
import { getWeeklyReview } from '@/lib/api';
import { startOfWeek } from '@/lib/workoutStats';

const SECTIONS = [
  { key: 'training', label: 'Training', icon: Dumbbell, tint: 'text-training-text bg-training-soft' },
  { key: 'fuel', label: 'Fuel', icon: Beef, tint: 'text-protein-text bg-protein-soft' },
  { key: 'win', label: 'Win of the week', icon: Trophy, tint: 'text-amber-600 bg-amber-50' },
  { key: 'focus', label: 'Next week\'s focus', icon: Target, tint: 'text-muted-foreground bg-muted' },
];

export default function WeeklyReviewCard() {
  const weekStart = startOfWeek(new Date().toLocaleDateString('en-CA'));
  const readKey = 'snapcal_review_read_' + weekStart;
  const [read, setRead] = useState(false);
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState(null);
  const [state, setState] = useState('idle'); // idle | loading | ready | error | nodata

  useEffect(() => { setRead(localStorage.getItem(readKey) === '1'); }, [readKey]);

  const openReview = async () => {
    setOpen(true);
    if (review) return;
    setState('loading');
    try {
      const { review: r } = await getWeeklyReview();
      setReview(r);
      setState('ready');
      localStorage.setItem(readKey, '1');
      setRead(true);
    } catch (e) {
      setState(e.status === 422 ? 'nodata' : 'error');
    }
  };

  return (
    <>
      {read ? (
        <button onClick={openReview}
          className="w-full h-12 bg-card rounded-2xl shadow-sm border border-border flex items-center gap-2 px-4 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <Sparkles className="w-4 h-4 text-ai" />
          Week of {weekStart} review · Read again
        </button>
      ) : (
        <div className="bg-card rounded-3xl p-6 shadow-sm border border-border border-l-4 border-l-indigo-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg font-bold text-foreground">Your Week in Review</h3>
              <p className="text-xs text-faint">Training + nutrition, one AI summary per week</p>
            </div>
            <button onClick={openReview}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200">
              Read review
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full sm:max-w-lg bg-card rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4 sm:hidden" />
              <button onClick={() => setOpen(false)} aria-label="Close"
                className="absolute top-4 right-4 p-2 bg-muted rounded-full text-muted-foreground"><X className="w-4 h-4" /></button>
              <h3 className="font-display text-xl font-bold text-foreground mb-4">Week of {weekStart}</h3>

              {state === 'loading' && (
                <div className="space-y-4">
                  {SECTIONS.map((s) => (
                    <div key={s.key} className="animate-pulse space-y-2">
                      <div className="h-3 bg-muted rounded w-1/4" />
                      <div className="h-2 bg-muted rounded w-full" />
                      <div className="h-2 bg-muted rounded w-3/4" />
                    </div>
                  ))}
                  <p className="text-xs text-faint text-center">Reviewing your week...</p>
                </div>
              )}
              {state === 'nodata' && <p className="text-sm text-muted-foreground">Log a few more days this week to get your review.</p>}
              {state === 'error' && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-3">Could not generate - try again.</p>
                  <button onClick={openReview} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl">Retry</button>
                </div>
              )}
              {state === 'ready' && review && (
                <div className="space-y-5">
                  {SECTIONS.map(({ key, label, icon: Icon, tint }) => review[key] ? (
                    <div key={key} className="flex gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${tint}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-faint uppercase tracking-wide">{label}</p>
                        <p className="text-sm text-foreground leading-relaxed">{review[key]}</p>
                      </div>
                    </div>
                  ) : null)}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
