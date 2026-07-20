'use client';

import React, { useEffect, useState } from 'react';
import { Play, Plus, RotateCcw, Trash2, Loader2, Folder, ChevronDown, ChevronUp } from 'lucide-react';
import { toDisplayVolume } from '@/lib/units';

const RECENCY_KEY = 'snapcal_routine_last_used';
const VISIBLE_CAP = 4;

export function readRoutineRecency() {
  try {
    return JSON.parse(localStorage.getItem(RECENCY_KEY)) || {};
  } catch {
    return {};
  }
}

export function recordRoutineUse(id) {
  try {
    const map = readRoutineRecency();
    map[id] = Date.now();
    localStorage.setItem(RECENCY_KEY, JSON.stringify(map));
  } catch {
    // localStorage unavailable — recency is a nicety, not a requirement
  }
}

// Loading mirror of the launchpad, shown while the workout-history fetch is
// in flight (workoutsReady false): repeat-last card, "My routines" header,
// and a 2-col routine grid — so the real launchpad swaps in without reflow
// and "Repeat last" never pops in late.
export function LaunchpadSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Loading training</span>
      {/* Layout classes live on the aria-hidden wrapper (house idiom) — a
          display:contents wrapper would break the parent's space-y child
          selector. */}
      <div aria-hidden="true" className="space-y-6">
        <div className="bg-card rounded-2xl p-5 border border-border animate-pulse motion-reduce:animate-none">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-32 bg-muted rounded" />
              <div className="h-4 w-full max-w-56 bg-muted rounded" />
              <div className="h-3 w-40 bg-muted rounded" />
            </div>
            <div className="w-10 h-10 shrink-0 rounded-full bg-muted" />
          </div>
        </div>
        <div className="animate-pulse motion-reduce:animate-none">
          <div className="h-3 w-24 bg-muted rounded mb-3" />
          <div className="grid grid-cols-2 gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="bg-card rounded-2xl p-4 border border-border">
                <div className="h-4 w-3/4 bg-muted rounded mb-2" />
                <div className="h-3 w-16 bg-muted rounded" />
                <div className="mt-3 ml-auto w-7 h-7 rounded-full bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Pre-session launchpad: repeat-last card + tappable routine cards (capped
// at 4, recency-ordered) + start-from-scratch. Cards are whole-tap targets:
// an absolute overlay button starts the routine (no nested buttons), the
// corner delete sits above it on z-10.
export default function StartLaunchpad({
  templates = [],
  lastSession = null,
  weightUnit = 'lb',
  isLoading = false,
  onRepeatLast,
  onStartTemplate,
  onDeleteTemplate,
  onAddExercise,
}) {
  const unit = weightUnit === 'kg' ? 'kg' : 'lb';
  const [showAll, setShowAll] = useState(false);
  const [recency, setRecency] = useState({});

  // Read after mount: SSR has no localStorage.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecency(readRoutineRecency());
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-training-text">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm font-medium">Loading routine…</p>
      </div>
    );
  }

  const hasAnything = Boolean(lastSession) || templates.length > 0;
  // Stable sort: recency desc, ties keep API order.
  const sorted = [...templates].sort((a, b) => (recency[b.id] || 0) - (recency[a.id] || 0));
  const visible = showAll ? sorted : sorted.slice(0, VISIBLE_CAP);

  return (
    <div className="space-y-6">
      {lastSession && (
        <button
          onClick={onRepeatLast}
          className="w-full text-left bg-card rounded-2xl p-5 border border-training-soft-border hover:bg-training-soft transition-colors group"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-training-text flex items-center gap-1.5 mb-1">
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Repeat last · {lastSession.dateLabel}
              </p>
              <p className="font-bold text-foreground truncate">
                {lastSession.exercises.map((e) => e.exercise).join(' · ')}
              </p>
              <p className="text-sm text-muted-foreground mt-1 tabular-nums">
                {lastSession.volumeLb > 0 && (
                  <>{toDisplayVolume(lastSession.volumeLb, unit).toLocaleString()} {unit} · </>
                )}
                {lastSession.durationSec > 0 && <>{Math.round(lastSession.durationSec / 60)} min · </>}
                {lastSession.exerciseCount} {lastSession.exerciseCount === 1 ? 'exercise' : 'exercises'}
              </p>
            </div>
            <span
              className="w-10 h-10 shrink-0 rounded-full bg-training text-white flex items-center justify-center group-hover:scale-105 transition-transform"
              aria-hidden="true"
            >
              <Play className="w-5 h-5 fill-current" />
            </span>
          </div>
        </button>
      )}

      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">My routines</h3>
        {templates.length === 0 ? (
          <div className="bg-card rounded-2xl p-5 border border-border text-center">
            <Folder className="w-8 h-8 mx-auto mb-2 text-faint" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Finish a session and save it as a routine to see it here.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {visible.map((temp) => (
                <div
                  key={temp.id}
                  className="relative bg-card rounded-2xl p-4 border border-border hover:border-training-soft-border transition-colors"
                >
                  <button
                    onClick={() => onStartTemplate(temp)}
                    aria-label={`Start ${temp.name}`}
                    className="absolute inset-0 rounded-2xl focus-visible:ring-2 focus-visible:ring-training"
                  />
                  <div className="pointer-events-none pr-8">
                    <h4 className="font-bold text-foreground truncate">{temp.name}</h4>
                    <p className="text-xs text-faint">
                      {temp.exercises.length} {temp.exercises.length === 1 ? 'exercise' : 'exercises'}
                    </p>
                    <span
                      className="mt-3 ml-auto w-7 h-7 rounded-full bg-training-soft text-training-text flex items-center justify-center"
                      aria-hidden="true"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </span>
                  </div>
                  <button
                    onClick={() => onDeleteTemplate(temp.id)}
                    aria-label={`Delete ${temp.name}`}
                    className="absolute top-1 right-1 z-10 min-h-11 min-w-11 flex items-center justify-center text-faint hover:text-destructive-text"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            {templates.length > VISIBLE_CAP && (
              <button
                onClick={() => setShowAll((v) => !v)}
                className="mt-3 w-full min-h-11 text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 transition-colors"
              >
                {showAll ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" /> Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" /> Show all ({templates.length})
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {hasAnything ? (
        <button
          onClick={onAddExercise}
          className="w-full py-3 min-h-11 text-training-text font-bold text-sm flex items-center justify-center gap-2 rounded-xl hover:bg-training-soft transition-colors"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Start from scratch
        </button>
      ) : (
        <button
          onClick={onAddExercise}
          className="w-full px-4 py-3 bg-training text-white rounded-xl font-bold hover:bg-training/90 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" aria-hidden="true" />
          Add Exercise
        </button>
      )}
    </div>
  );
}
