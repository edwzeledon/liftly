'use client';

import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronRight, Utensils, Image as ImageIcon, Trash2, Edit2, Dumbbell, X } from 'lucide-react';
import { deleteLog, deleteWorkoutLog } from '@/lib/api';
import { formatWeight, toDisplayVolume } from '@/lib/units';
import { dayVolumeLb, macroSplit, dayDurationSec } from '@/lib/daySummary';
import ConfirmModal from './ConfirmModal';
import WorkoutCard from './workout/WorkoutCard';
import { useToast } from '@/hooks/useToast';
import { useModalBehavior } from '@/hooks/useModalBehavior';

function HistorySkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Loading history</span>
      <div aria-hidden="true" className="space-y-6">
      {[0, 1].map((i) => (
        <div key={i} className="bg-card rounded-2xl p-6 border border-border">
          <div className="animate-pulse motion-reduce:animate-none">
            <div className="h-5 bg-muted rounded w-1/3" />
            <div className="mt-3 flex gap-8">
              <div className="space-y-1.5">
                <div className="h-7 w-24 bg-muted rounded" />
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
              <div className="space-y-1.5">
                <div className="h-7 w-24 bg-muted rounded" />
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
            </div>
            <div className="mt-2 h-1.5 bg-muted rounded-full" />
            <div className="mt-4 space-y-3">
              <div className="h-5 w-28 bg-muted rounded" />
              <div className="h-5 w-28 bg-muted rounded" />
            </div>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}

function HistoryError({ onRetry }) {
  return (
    <div className="bg-card rounded-2xl p-6 border border-border text-center">
      <p className="text-sm text-muted-foreground mb-3">Couldn&apos;t load your history.</p>
      <button onClick={onRetry} className="px-4 py-2 min-h-11 bg-training text-background text-sm font-bold rounded-xl">
        Retry
      </button>
    </div>
  );
}

const getBestSet = (sets) => {
  const completed = (sets || []).filter((s) => s?.completed);
  if (completed.length === 0) return null;
  // Find set with max weight
  return completed.reduce((max, current) => {
    const currentWeight = parseFloat(current.weight) || 0;
    const maxWeight = parseFloat(max.weight) || 0;
    return currentWeight > maxWeight ? current : max;
  });
};

const formatDuration = (seconds) => {
  if (!seconds) return 'Completed';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

function MacroBar({ split }) {
  if (!split) return null;
  return (
    <>
      <div
        role="img"
        aria-label={`Macros: ${split.p}% protein, ${split.c}% carbs, ${split.f}% fat`}
        className="mt-2 h-1.5 rounded-full overflow-hidden bg-muted flex"
      >
        <div className="bg-protein h-full" style={{ width: `${split.p}%` }} />
        <div className="bg-carb h-full" style={{ width: `${split.c}%` }} />
        <div className="bg-fat h-full" style={{ width: `${split.f}%` }} />
      </div>
      <p aria-hidden="true" className="mt-1.5 text-xs text-muted-foreground flex gap-2">
        <span><span className="text-protein-text font-medium">P</span> {split.p}%</span>
        <span><span className="text-carb-text font-medium">C</span> {split.c}%</span>
        <span><span className="text-fat-text font-medium">F</span> {split.f}%</span>
      </p>
    </>
  );
}

function TrainingSection({ dayWorkouts, weightUnit, onEdit, onDelete }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-faint" />
          Exercises
        </p>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            aria-label="Edit workout session"
            className="p-2 min-h-11 min-w-11 flex items-center justify-center text-faint hover:text-training hover:bg-training-soft rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="Edit Session"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            aria-label="Delete workout session"
            className="p-2 min-h-11 min-w-11 flex items-center justify-center text-faint hover:text-destructive-text hover:bg-destructive/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="Delete Session"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {dayWorkouts.map((log) => {
          const completedSets = (log.sets || []).filter((s) => s?.completed).length;
          const bestSet = getBestSet(log.sets);
          return (
            <div key={log.id} className="flex items-center justify-between p-3 bg-muted rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-card flex items-center justify-center text-training font-bold text-xs">
                  {(log.exercise || log.exercise_name || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">{log.exercise || log.exercise_name}</p>
                  <p className="text-xs text-muted-foreground">{completedSets} {completedSets === 1 ? 'Set' : 'Sets'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Best Set</p>
                <p className="font-display text-sm font-semibold tabular-nums text-foreground">
                  {bestSet ? `${formatWeight(bestSet.weight, weightUnit)} × ${bestSet.reps}` : '-'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NutritionSection({ dayMeals, onEdit, onDelete, withDivider }) {
  return (
    <div className={withDivider ? 'border-t border-border pt-4 mt-4' : ''}>
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Utensils className="w-4 h-4 text-faint" />
          Meals
        </p>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            aria-label="Edit meals"
            className="p-2 min-h-11 min-w-11 flex items-center justify-center text-faint hover:text-training hover:bg-training-soft rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="Edit Meals"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            aria-label="Delete all meals"
            className="p-2 min-h-11 min-w-11 flex items-center justify-center text-faint hover:text-destructive-text hover:bg-destructive/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="Delete All Meals"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {dayMeals.map((log) => (
          <div key={log.id} className="flex items-center justify-between p-3 bg-muted rounded-xl group">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${log.method === 'ai-scan' ? 'bg-ai-soft-border text-ai' : 'bg-card text-muted-foreground'}`}>
                {log.method === 'ai-scan' ? <ImageIcon className="w-4 h-4" /> : <Utensils className="w-4 h-4" />}
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">{log.food_item}</p>
                <p className="text-xs text-muted-foreground flex flex-wrap gap-2">
                  <span>{new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {(log.protein || log.carbs || log.fats) && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="flex gap-1">
                        {log.protein > 0 && <span className="text-protein-text font-medium">P:{log.protein}</span>}
                        {log.carbs > 0 && <span className="text-carb-text font-medium">C:{log.carbs}</span>}
                        {log.fats > 0 && <span className="text-fat-text font-medium">F:{log.fats}</span>}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="font-display text-sm font-semibold tabular-nums text-foreground">{log.calories} kcal</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DayCard({ label, dayMeals, dayWorkouts, weightUnit, onEditWorkouts, onDeleteWorkouts, onEditMeals, onDeleteMeals }) {
  const [openWorkouts, setOpenWorkouts] = useState(false);
  const [openMeals, setOpenMeals] = useState(false);
  const volumeLb = dayVolumeLb(dayWorkouts);
  const durationSec = dayDurationSec(dayWorkouts);
  const kcal = dayMeals.reduce((sum, item) => sum + (parseInt(item.calories) || 0), 0);
  const split = macroSplit(dayMeals);

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden p-6">
      <h3 className="font-display text-lg font-bold text-foreground">{label}</h3>

      <div className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
        {dayWorkouts.length > 0 && (
          <div>
            {volumeLb > 0 ? (
              <>
                <p className="font-display text-2xl font-bold tabular-nums text-foreground">
                  {toDisplayVolume(volumeLb, weightUnit).toLocaleString()} <span className="text-sm font-semibold text-muted-foreground">{weightUnit}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  volume{durationSec > 0 && <> · {formatDuration(durationSec)}</>}
                </p>
              </>
            ) : durationSec > 0 ? (
              <>
                <p className="font-display text-2xl font-bold tabular-nums text-foreground">{formatDuration(durationSec)}</p>
                <p className="text-xs text-muted-foreground">training</p>
              </>
            ) : (
              <>
                <p className="font-display text-2xl font-bold tabular-nums text-foreground">{dayWorkouts.length}</p>
                <p className="text-xs text-muted-foreground">{dayWorkouts.length === 1 ? 'exercise' : 'exercises'}</p>
              </>
            )}
          </div>
        )}
        {dayMeals.length > 0 && (
          <div>
            <p className="font-display text-2xl font-bold tabular-nums text-foreground">
              {kcal.toLocaleString()} <span className="text-sm font-semibold text-muted-foreground">kcal</span>
            </p>
            <p className="text-xs text-muted-foreground">{dayMeals.length} {dayMeals.length === 1 ? 'meal' : 'meals'}</p>
          </div>
        )}
      </div>

      <MacroBar split={split} />

      <div className="mt-4 space-y-1">
        {dayWorkouts.length > 0 && (
          <>
            <button
              onClick={() => setOpenWorkouts(o => !o)}
              aria-expanded={openWorkouts}
              className="w-full min-h-11 flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight className={`w-4 h-4 transition-transform ${openWorkouts ? 'rotate-90' : ''}`} />
              {dayWorkouts.length} {dayWorkouts.length === 1 ? 'exercise' : 'exercises'}
            </button>
            {openWorkouts && (
              <div className="mt-2 mb-2">
                <TrainingSection
                  dayWorkouts={dayWorkouts}
                  weightUnit={weightUnit}
                  onEdit={onEditWorkouts}
                  onDelete={onDeleteWorkouts}
                />
              </div>
            )}
          </>
        )}
        {dayMeals.length > 0 && (
          <>
            <button
              onClick={() => setOpenMeals(o => !o)}
              aria-expanded={openMeals}
              className="w-full min-h-11 flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight className={`w-4 h-4 transition-transform ${openMeals ? 'rotate-90' : ''}`} />
              {dayMeals.length} {dayMeals.length === 1 ? 'meal' : 'meals'}
            </button>
            {openMeals && (
              <div className="mt-2 mb-2">
                <NutritionSection
                  dayMeals={dayMeals}
                  onEdit={onEditMeals}
                  onDelete={onDeleteMeals}
                  withDivider={false}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function HistoryEmpty({ onCta }) {
  return (
    <div className="bg-card rounded-2xl p-6 border border-border">
      <div className="h-40 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-2xl text-center">
        <Calendar className="w-6 h-6 text-faint" />
        <p className="text-sm text-muted-foreground">Nothing logged yet</p>
        <div className="flex items-center gap-4">
          <button onClick={() => onCta('meals')} className="min-h-11 px-3 text-xs font-bold text-protein-text">
            Log a meal →
          </button>
          <button onClick={() => onCta('workouts')} className="min-h-11 px-3 text-xs font-bold text-training">
            Log a workout →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HistoryView({ logs = [], workoutLogs = [], user, onMealDeleted, onWorkoutDeleted, onEditLog, weightUnit = 'lb', loading = false, staleData = false, onRetry, onLogCta }) {
  const [visibleDays, setVisibleDays] = useState(60); // rendered day-group slice
  const [editingDay, setEditingDay] = useState(null); // { label, logs, type: 'workouts' | 'meals' }

  // Day-editor modal: same close path for the X button and Escape, so both
  // routes stay in sync (including the parent data refresh on close).
  const dialogRef = useRef(null);
  const closeEditingDay = () => {
    setEditingDay(null);
    // Refresh the slice matching the modal's type (editingDay still holds the
    // pre-close value in this closure).
    const refresh = editingDay?.type === 'workouts' ? onWorkoutDeleted : onMealDeleted;
    if (refresh) refresh();
  };
  // Mirrors ConfirmModal's Escape/focus pattern: Escape closes the topmost
  // overlay and focus moves to (then restores from) the close button.
  const { closeRef } = useModalBehavior(!!editingDay, closeEditingDay);
  // Basic focus containment: wrap Tab/Shift+Tab among the dialog's own
  // focusable elements so focus can't escape to the page behind it.
  const handleDialogTabKey = (e) => {
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const [optimisticallyDeletedIds, setOptimisticallyDeletedIds] = useState(new Set());
  const { toastEl, showToast } = useToast();

  const unhideLog = (logId) => {
    setOptimisticallyDeletedIds(prev => {
      const next = new Set(prev);
      next.delete(logId);
      return next;
    });
  };

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: true
  });

  const handleDeleteLog = async (logId, exerciseName = null, type = 'workout') => {
    if (!user) return;

    // Meal rows: optimistic hide + undoable toast. The real deleteLog runs on the
    // toast's onCommit; Undo cancels it. No confirm dialog for single meals.
    if (type === 'meal') {
      setOptimisticallyDeletedIds(prev => new Set(prev).add(logId));
      showToast({
        message: 'Meal deleted',
        action: {
          label: 'Undo',
          onAction: () => unhideLog(logId),
        },
        onCommit: () => {
          deleteLog(logId, user.id)
            .then(async () => {
              if (onMealDeleted) await onMealDeleted();
              // Prune the id once the refetch has landed — the row is gone from
              // props by now, so this can't flash it back.
              unhideLog(logId);
            })
            .catch((e) => {
              console.error("Error deleting", e);
              // Commit failed: unhide and surface the error.
              unhideLog(logId);
              showToast({ message: "Couldn't delete meal", variant: 'error' });
            });
        },
      });
      return;
    }

    // Workout rows keep the confirm dialog (destructive, no undo path).
    setConfirmModal({
      isOpen: true,
      title: 'Delete Entry',
      message: 'Are you sure you want to delete this entry? This cannot be undone.',
      isDestructive: true,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));

        // Optimistic update
        setOptimisticallyDeletedIds(prev => new Set(prev).add(logId));

        try {
          await deleteWorkoutLog(logId);
          // Clear PR cache if exercise name is provided
          if (exerciseName) {
            localStorage.removeItem(`snapcal_pr_${exerciseName}`);
          }
          if (onWorkoutDeleted) onWorkoutDeleted();
        } catch (e) {
          console.error("Error deleting", e);
          // Revert optimistic update on error
          setOptimisticallyDeletedIds(prev => {
            const next = new Set(prev);
            next.delete(logId);
            return next;
          });
        }
      }
    });
  };

  const handleDeleteDayWorkout = async (dayLogs) => {
    if (!user) return;

    setConfirmModal({
      isOpen: true,
      title: 'Delete Workout Session',
      message: 'Are you sure you want to delete this entire workout session? All exercises will be removed.',
      isDestructive: true,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        
        // Optimistic update
        setOptimisticallyDeletedIds(prev => {
            const next = new Set(prev);
            dayLogs.forEach(log => next.add(log.id));
            return next;
        });

        try {
          const promises = dayLogs.map(log => deleteWorkoutLog(log.id));
          await Promise.all(promises);
          
          // Clear PR Cache for these exercises
          dayLogs.forEach(log => {
             const name = log.exercise || log.exercise_name;
             if (name) {
                 localStorage.removeItem(`snapcal_pr_${name}`);
             }
          });

          if (onWorkoutDeleted) onWorkoutDeleted();
        } catch (e) {
          console.error("Error deleting session", e);
          // Revert optimistic update
          setOptimisticallyDeletedIds(prev => {
            const next = new Set(prev);
            dayLogs.forEach(log => next.delete(log.id));
            return next;
          });
        }
      }
    });
  };

  const handleDeleteDayMeals = async (dayLogs) => {
    if (!user) return;

    setConfirmModal({
      isOpen: true,
      title: 'Delete Day Logs',
      message: 'Are you sure you want to delete all meal logs for this day?',
      isDestructive: true,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        
        // Optimistic update
        setOptimisticallyDeletedIds(prev => {
            const next = new Set(prev);
            dayLogs.forEach(log => next.add(log.id));
            return next;
        });

        try {
          const promises = dayLogs.map(log => deleteLog(log.id, user.id));
          await Promise.all(promises);
          if (onMealDeleted) onMealDeleted();
        } catch (e) {
          console.error("Error deleting day meals", e);
          // Revert optimistic update
          setOptimisticallyDeletedIds(prev => {
            const next = new Set(prev);
            dayLogs.forEach(log => next.delete(log.id));
            return next;
          });
        }
      }
    });
  };

  const handleUpdateLog = (updatedLog) => {
    // Optimistic update for the editing modal
    if (editingDay) {
      setEditingDay(prev => ({
        ...prev,
        logs: prev.logs.map(log => log.id === updatedLog.id ? updatedLog : log)
      }));
    }
    // The parent component (App) will refetch data when we close or if we trigger a refresh,
    // but WorkoutCard handles the API call internally.
  };

  // Merge meals + workouts into one group per date, all-time. The 60-group
  // slice below (Load older) is the only pagination.
  const { dayGroups } = useMemo(() => {
    const meals = logs.filter(l => !optimisticallyDeletedIds.has(l.id));
    const workouts = workoutLogs.filter(l => !optimisticallyDeletedIds.has(l.id));

    const groups = {};
    const bucket = (log) => {
      const dateObj = new Date(log.date);
      const dateKey = dateObj.toLocaleDateString();
      if (!groups[dateKey]) groups[dateKey] = { date: dateObj, meals: [], workouts: [] };
      return groups[dateKey];
    };
    meals.forEach(l => bucket(l).meals.push(l));
    workouts.forEach(l => bucket(l).workouts.push(l));

    const sorted = Object.values(groups)
      .sort((a, b) => b.date - a.date)
      .map(group => {
        const isToday = new Date().toLocaleDateString() === group.date.toLocaleDateString();
        const label = isToday ? 'Today' : group.date.toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        return { label, meals: group.meals, workouts: group.workouts };
      });

    return { dayGroups: sorted };
  }, [logs, workoutLogs, optimisticallyDeletedIds]);

  const renderedGroups = dayGroups.slice(0, visibleDays);

  return (
    <div className="p-6 md:p-0 space-y-6 max-w-3xl mx-auto min-h-full pb-20 md:pb-8">
      <h2 className="font-display text-2xl font-bold text-foreground">History</h2>

      {/* Edit Workout Modal */}
      {editingDay && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={editingDay.type === 'workouts' ? 'Edit Workout' : 'Edit Meals'}
          onKeyDown={handleDialogTabKey}
          className="fixed inset-0 z-50 flex flex-col bg-background animate-in slide-in-from-bottom-10"
        >
          <div className="bg-card border-b border-border pt-safe shrink-0">
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">{editingDay.type === 'workouts' ? 'Edit Workout' : 'Edit Meals'}</h2>
                <p className="text-sm text-muted-foreground">{editingDay.label}</p>
              </div>
              <button
                ref={closeRef}
                onClick={closeEditingDay}
                aria-label="Close"
                className="p-2 min-h-11 min-w-11 flex items-center justify-center bg-muted rounded-full text-muted-foreground hover:bg-muted/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-xl mx-auto space-y-4">
              {editingDay.type === 'workouts' ? (
                editingDay.logs.map(log => (
                  <WorkoutCard
                    key={log.id}
                    log={log}
                    onDelete={(id) => {
                      // Handle delete within modal
                      handleDeleteLog(id, log.exercise || log.exercise_name, 'workout');
                      setEditingDay(prev => ({
                        ...prev,
                        logs: prev.logs.filter(l => l.id !== id)
                      }));
                    }}
                    onUpdate={handleUpdateLog}
                    weightUnit={weightUnit}
                  />
                ))
              ) : (
                editingDay.logs.map(log => (
                  <div key={log.id} className="bg-card p-4 rounded-2xl border border-border flex justify-between items-center">
                     <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${log.method === 'ai-scan' ? 'bg-ai-soft-border text-ai' : 'bg-muted text-muted-foreground'}`}>
                          {log.method === 'ai-scan' ? <ImageIcon className="w-4 h-4" /> : <Utensils className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{log.food_item}</p>
                          <p className="text-xs font-display font-semibold tabular-nums text-muted-foreground">{log.calories} kcal</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-2">
                        <button
                          onClick={() => onEditLog(log)}
                          aria-label="Edit meal"
                          className="p-2 min-h-11 min-w-11 flex items-center justify-center text-faint hover:text-training hover:bg-training-soft rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                           onClick={() => {
                             handleDeleteLog(log.id, null, 'meal');
                             setEditingDay(prev => ({
                               ...prev,
                               logs: prev.logs.filter(l => l.id !== log.id)
                             }));
                           }}
                           aria-label="Delete meal"
                           className="p-2 min-h-11 min-w-11 flex items-center justify-center text-faint hover:text-destructive-text hover:bg-destructive/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                  </div>
                ))
              )}
              {editingDay.logs.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No entries left in this session.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {loading && dayGroups.length === 0 ? (
        <HistorySkeleton />
      ) : staleData && dayGroups.length === 0 ? (
        <HistoryError onRetry={onRetry} />
      ) : dayGroups.length === 0 ? (
        <HistoryEmpty onCta={(mode) => onLogCta && onLogCta(mode)} />
      ) : (
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
          {renderedGroups.map(({ label, meals: dayMeals, workouts: dayWorkouts }) => (
            <motion.div
              key={label}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <DayCard
                label={label}
                dayMeals={dayMeals}
                dayWorkouts={dayWorkouts}
                weightUnit={weightUnit}
                onEditWorkouts={() => setEditingDay({ label, logs: dayWorkouts, type: 'workouts' })}
                onDeleteWorkouts={() => handleDeleteDayWorkout(dayWorkouts)}
                onEditMeals={() => setEditingDay({ label, logs: dayMeals, type: 'meals' })}
                onDeleteMeals={() => handleDeleteDayMeals(dayMeals)}
              />
            </motion.div>
          ))}
          </AnimatePresence>
          {dayGroups.length > visibleDays && (
            <button
              onClick={() => setVisibleDays(v => v + 60)}
              className="w-full min-h-11 bg-card border border-border rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Load older
            </button>
          )}
          {dayGroups.length > 0 && dayGroups.length <= visibleDays && (
            <p className="text-center text-xs text-faint py-2">You&apos;ve reached the beginning</p>
          )}
        </div>
      )}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        isDestructive={confirmModal.isDestructive}
        confirmLabel={confirmModal.confirmLabel}
      />
      {toastEl}
    </div>
  );
}
