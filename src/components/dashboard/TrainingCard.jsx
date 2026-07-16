'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, ChevronRight, Check } from 'lucide-react';
import { useApp } from '@/components/app/AppProvider';
import { todayWorkoutSummary } from '@/lib/daySummary';
import { toDisplayVolume } from '@/lib/units';

// Sunday-start week strip: 7 dots, trained days filled, today ringed.
function WeekStrip({ workoutLogs }) {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push({
      key: d.toDateString(),
      letter: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
      trained: (workoutLogs || []).some(
        (l) => l && new Date(l.date).toDateString() === d.toDateString()
      ),
      isToday: d.toDateString() === today.toDateString(),
    });
  }
  return (
    <div className="flex items-center justify-between" aria-hidden="true">
      {days.map((d) => (
        <div key={d.key} className="flex flex-col items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${d.trained ? 'bg-training' : 'bg-muted'} ${
              d.isToday ? 'ring-2 ring-training/40' : ''
            }`}
          />
          <span className="text-[10px] text-faint">{d.letter}</span>
        </div>
      ))}
    </div>
  );
}

// Today's training tile for the desktop command center (also renders on
// mobile below the hero). Three states: session in progress → resume;
// trained today → stats; otherwise → start CTA.
export default function TrainingCard() {
  const app = useApp();
  const router = useRouter();
  const summary = todayWorkoutSummary(app.workoutLogs);
  const inProgress = (app.activeWorkoutLogs?.length || 0) > 0;
  const unit = app.weightUnit === 'kg' ? 'kg' : 'lb';

  return (
    <div className="bg-card rounded-2xl p-6 border border-border h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Training</h3>
        <Dumbbell className="w-4 h-4 text-training-text" aria-hidden="true" />
      </div>

      <div className="flex-1">
        {inProgress ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-training animate-pulse" aria-hidden="true" />
              <p className="font-display text-lg font-bold text-foreground">Session in progress</p>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Pick up where you left off.</p>
            <button
              onClick={() => router.push('/train')}
              className="w-full py-3 bg-training text-white font-bold rounded-xl hover:bg-training/90 active:scale-95 transition-all"
            >
              Resume session
            </button>
          </>
        ) : summary.trained ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-5 h-5 rounded-full bg-training-soft text-training-text flex items-center justify-center"
                aria-hidden="true"
              >
                <Check className="w-3.5 h-3.5" />
              </span>
              <p className="font-display text-lg font-bold text-foreground">Trained today</p>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 mb-2">
              {summary.volumeLb > 0 && (
                <div>
                  <p className="font-display text-2xl font-bold tabular-nums text-foreground">
                    {toDisplayVolume(summary.volumeLb, unit).toLocaleString()}
                    <span className="text-sm font-medium text-muted-foreground"> {unit}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">volume</p>
                </div>
              )}
              <div>
                <p className="font-display text-2xl font-bold tabular-nums text-foreground">{summary.exerciseCount}</p>
                <p className="text-xs text-muted-foreground">
                  {summary.exerciseCount === 1 ? 'exercise' : 'exercises'}
                </p>
              </div>
              {summary.durationSec > 0 && (
                <div>
                  <p className="font-display text-2xl font-bold tabular-nums text-foreground">
                    {Math.round(summary.durationSec / 60)}
                    <span className="text-sm font-medium text-muted-foreground"> min</span>
                  </p>
                  <p className="text-xs text-muted-foreground">duration</p>
                </div>
              )}
            </div>
            <button
              onClick={() => router.push('/train')}
              className="min-h-11 text-xs font-bold text-training-text flex items-center gap-1"
            >
              View session <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </>
        ) : (
          <>
            <p className="font-display text-lg font-bold text-foreground mb-1">No session yet</p>
            <p className="text-sm text-muted-foreground mb-4">Rest day, or time to lift?</p>
            <button
              onClick={() => router.push('/train')}
              className="w-full py-3 bg-training text-white font-bold rounded-xl hover:bg-training/90 active:scale-95 transition-all"
            >
              Start training
            </button>
          </>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <WeekStrip workoutLogs={app.workoutLogs} />
      </div>
    </div>
  );
}
