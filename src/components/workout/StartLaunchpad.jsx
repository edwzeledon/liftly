'use client';

import React from 'react';
import { Play, Plus, RotateCcw, Trash2, Loader2, Folder } from 'lucide-react';
import { toDisplayVolume } from '@/lib/units';

// Pre-session launchpad: repeat-last card + routine cards + start-from-scratch.
// Pure presentation — template CRUD and session creation live in WorkoutView
// (onRepeatLast / onStartTemplate both funnel into handleLoadTemplate).
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-training-text">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm font-medium">Loading routine…</p>
      </div>
    );
  }

  const hasAnything = Boolean(lastSession) || templates.length > 0;

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
          <div className="grid grid-cols-2 gap-3">
            {templates.map((temp) => (
              <div key={temp.id} className="bg-card rounded-2xl p-4 border border-border flex flex-col gap-3">
                <div className="min-w-0">
                  <h4 className="font-bold text-foreground truncate">{temp.name}</h4>
                  <p className="text-xs text-faint">
                    {temp.exercises.length} {temp.exercises.length === 1 ? 'exercise' : 'exercises'}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <button
                    onClick={() => onStartTemplate(temp)}
                    aria-label={`Start ${temp.name}`}
                    className="flex-1 mr-2 py-2 min-h-11 bg-training text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-training/90 active:scale-95 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                    Start
                  </button>
                  <button
                    onClick={() => onDeleteTemplate(temp.id)}
                    aria-label={`Delete ${temp.name}`}
                    className="min-h-11 min-w-11 flex items-center justify-center text-faint hover:text-destructive-text rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
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
