'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Utensils, Image as ImageIcon, Trash2, Edit2, Dumbbell, X } from 'lucide-react';
import { deleteLog, deleteWorkoutLog } from '@/lib/api';
import { formatWeight } from '@/lib/units';
import SegmentedControl from '@/components/ui/SegmentedControl';
import ConfirmModal from './ConfirmModal';
import WorkoutCard from './workout/WorkoutCard';
import { useToast } from '@/hooks/useToast';

const VIEW_MODES = [{ label: 'Meals', value: 'meals' }, { label: 'Workouts', value: 'workouts' }];
const RANGES = [{ label: '7D', value: 7 }, { label: '30D', value: 30 }, { label: 'All', value: 0 }];

function HistorySkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1].map((i) => (
        <div key={i} className="bg-card rounded-2xl p-5 border border-border">
          <div className="animate-pulse space-y-3">
            <div className="h-5 bg-muted rounded w-1/3" />
            <div className="h-16 bg-muted rounded-xl" />
            <div className="h-16 bg-muted rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

function HistoryError({ onRetry }) {
  return (
    <div className="bg-card rounded-2xl p-6 border border-border text-center">
      <p className="text-sm text-muted-foreground mb-3">Couldn&apos;t load your history.</p>
      <button onClick={onRetry} className="px-4 py-2 min-h-11 bg-training text-white text-sm font-bold rounded-xl">
        Retry
      </button>
    </div>
  );
}

function HistoryEmpty({ viewMode, onCta }) {
  const Icon = viewMode === 'meals' ? Utensils : Dumbbell;
  return (
    <div className="bg-card rounded-2xl p-6 border border-border">
      <div className="h-40 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-2xl text-center">
        <Icon className="w-6 h-6 text-faint" />
        <p className="text-sm text-muted-foreground">No {viewMode} logged yet</p>
        <button
          onClick={onCta}
          className={`min-h-11 px-3 text-xs font-bold ${viewMode === 'meals' ? 'text-protein-text' : 'text-training-text'}`}
        >
          {viewMode === 'meals' ? 'Log a meal →' : 'Log a workout →'}
        </button>
      </div>
    </div>
  );
}

function HistoryRangeEmpty({ rangeDays, onShowAll }) {
  return (
    <div className="bg-card rounded-2xl p-6 border border-border text-center">
      <p className="text-sm text-muted-foreground mb-3">Nothing in the last {rangeDays} days.</p>
      <button onClick={onShowAll} className="min-h-11 px-3 text-xs font-bold text-training-text">
        Show all →
      </button>
    </div>
  );
}

export default function HistoryView({ logs = [], workoutLogs = [], user, onLogDeleted, onEditLog, weightUnit = 'lb', loading = false, staleData = false, onRetry, onLogCta }) {
  const [viewMode, setViewMode] = useState('workouts'); // 'meals' | 'workouts'
  const [rangeDays, setRangeDays] = useState(7); // 7 | 30 | 0 (all)
  const [editingDay, setEditingDay] = useState(null); // { label, logs }
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

  const handleDeleteLog = async (logId, exerciseName = null) => {
    if(!user) return;

    // Meal rows: optimistic hide + undoable toast. The real deleteLog runs on the
    // toast's onCommit; Undo cancels it. No confirm dialog for single meals.
    if (viewMode === 'meals') {
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
              if (onLogDeleted) await onLogDeleted();
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
          if (onLogDeleted) onLogDeleted();
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

          if (onLogDeleted) onLogDeleted();
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
          if (onLogDeleted) onLogDeleted();
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

  const getBestSet = (sets) => {
    if (!sets || sets.length === 0) return null;
    // Find set with max weight
    const best = sets.reduce((max, current) => {
      const currentWeight = parseFloat(current.weight) || 0;
      const maxWeight = parseFloat(max.weight) || 0;
      return currentWeight > maxWeight ? current : max;
    }, sets[0]);
    
    return best;
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

  // Group by date and sort descending; range-filter first (rolling N days, local)
  const { groupedLogs, hasAnyAllTime } = useMemo(() => {
    const visible = (viewMode === 'meals' ? logs : workoutLogs)
      .filter(log => !optimisticallyDeletedIds.has(log.id));

    let cutoff = null;
    if (rangeDays > 0) {
      cutoff = new Date();
      cutoff.setHours(0, 0, 0, 0);
      cutoff.setDate(cutoff.getDate() - (rangeDays - 1));
    }
    const currentLogs = cutoff ? visible.filter(log => new Date(log.date) >= cutoff) : visible;

    const groups = {};
    currentLogs.forEach(log => {
      const dateObj = new Date(log.date);
      const dateKey = dateObj.toLocaleDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = { date: dateObj, logs: [] };
      }
      groups[dateKey].logs.push(log);
    });

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
        return { label, logs: group.logs };
      });

    return { groupedLogs: sorted, hasAnyAllTime: visible.length > 0 };
  }, [logs, workoutLogs, viewMode, optimisticallyDeletedIds, rangeDays]);

  return (
    <div className="p-6 md:p-0 space-y-6 max-w-3xl mx-auto min-h-full pb-20 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold text-foreground">History</h2>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl options={VIEW_MODES} value={viewMode} onChange={setViewMode} />
          <SegmentedControl options={RANGES} value={rangeDays} onChange={setRangeDays} />
        </div>
      </div>

      {/* Edit Workout Modal */}
      {editingDay && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in slide-in-from-bottom-10">
          <div className="bg-card border-b border-border pt-safe shrink-0">
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-foreground">Edit Workout</h2>
                <p className="text-sm text-muted-foreground">{editingDay.label}</p>
              </div>
              <button
                onClick={() => {
                  setEditingDay(null);
                  if (onLogDeleted) onLogDeleted(); // Refresh parent data
                }}
                aria-label="Close"
                className="p-2 min-h-11 min-w-11 flex items-center justify-center bg-muted rounded-full text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-xl mx-auto space-y-4">
              {viewMode === 'workouts' ? (
                editingDay.logs.map(log => (
                  <WorkoutCard
                    key={log.id}
                    log={log}
                    onDelete={(id) => {
                      // Handle delete within modal
                      handleDeleteLog(id, log.exercise || log.exercise_name);
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
                          className="p-2 min-h-11 min-w-11 flex items-center justify-center text-faint hover:text-training-text hover:bg-training-soft rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                           onClick={() => {
                             handleDeleteLog(log.id);
                             setEditingDay(prev => ({
                               ...prev,
                               logs: prev.logs.filter(l => l.id !== log.id)
                             }));
                           }}
                           aria-label="Delete meal"
                           className="p-2 min-h-11 min-w-11 flex items-center justify-center text-faint hover:text-destructive-text hover:bg-destructive/10 rounded-lg transition-colors"
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

      {loading && !hasAnyAllTime ? (
        <HistorySkeleton />
      ) : staleData && !hasAnyAllTime ? (
        <HistoryError onRetry={onRetry} />
      ) : groupedLogs.length === 0 ? (
        hasAnyAllTime ? (
          <HistoryRangeEmpty rangeDays={rangeDays} onShowAll={() => setRangeDays(0)} />
        ) : (
          <HistoryEmpty viewMode={viewMode} onCta={() => onLogCta && onLogCta(viewMode)} />
        )
      ) : (
        <div className="space-y-6" key={viewMode}>
          <AnimatePresence mode="popLayout">
          {groupedLogs.map(({ label, logs: dayLogs }) => (
            <motion.div 
              key={label}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 sticky top-0 bg-background/90 backdrop-blur py-2 z-10">
                {label}
              </h3>

              {viewMode === 'workouts' ? (
                // Grouped Workout Card
                <div className="bg-card rounded-2xl border border-border overflow-hidden p-5">
                  <div className="flex justify-between items-center mb-4 border-b border-border pb-4">
                    <div>
                      <h4 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                        <Dumbbell className="w-5 h-5 text-faint" />
                        Workout Session
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {dayLogs.length} Exercises • {formatDuration(dayLogs[0]?.duration)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingDay({ label, logs: dayLogs })}
                        aria-label="Edit workout session"
                        className="p-2 min-h-11 min-w-11 flex items-center justify-center text-faint hover:text-training-text hover:bg-training-soft rounded-lg transition-colors"
                        title="Edit Session"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDayWorkout(dayLogs)}
                        aria-label="Delete workout session"
                        className="p-2 min-h-11 min-w-11 flex items-center justify-center text-faint hover:text-destructive-text hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Delete Session"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {dayLogs.map((log) => {
                      const bestSet = getBestSet(log.sets);
                      return (
                        <div key={log.id} className="flex items-center justify-between p-3 bg-muted rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-card flex items-center justify-center text-training-text font-bold text-xs">
                              {(log.exercise || log.exercise_name || '?').charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-foreground text-sm">{log.exercise || log.exercise_name}</p>
                              <p className="text-xs text-muted-foreground">{log.sets?.length || 0} Sets</p>
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
              ) : (
                // Grouped Meal Card
                <div className="bg-card rounded-2xl border border-border overflow-hidden p-5">
                  <div className="flex justify-between items-center mb-4 border-b border-border pb-4">
                    <div>
                      <h4 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                        <Utensils className="w-5 h-5 text-faint" />
                        Daily Nutrition
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {dayLogs.length} Meals • {dayLogs.reduce((sum, item) => sum + (parseInt(item.calories)||0), 0)} kcal
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingDay({ label, logs: dayLogs })}
                        aria-label="Edit meals"
                        className="p-2 min-h-11 min-w-11 flex items-center justify-center text-faint hover:text-training-text hover:bg-training-soft rounded-lg transition-colors"
                        title="Edit Meals"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDayMeals(dayLogs)}
                        aria-label="Delete all meals"
                        className="p-2 min-h-11 min-w-11 flex items-center justify-center text-faint hover:text-destructive-text hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Delete All Meals"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {dayLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-3 bg-muted rounded-xl group">
                        <div className="flex items-center gap-3">
                           <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${log.method === 'ai-scan' ? 'bg-ai-soft-border text-ai' : 'bg-card text-muted-foreground'}`}>
                             {log.method === 'ai-scan' ? <ImageIcon className="w-4 h-4" /> : <Utensils className="w-4 h-4" />}
                           </div>
                           <div>
                             <p className="font-bold text-foreground text-sm">{log.food_item}</p>
                             <p className="text-xs text-muted-foreground flex flex-wrap gap-2">
                               <span>{new Date(log.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                               {(log.protein || log.carbs || log.fats) && (
                                 <>
                                   <span className="text-muted-foreground">•</span>
                                   <span className="flex gap-1">
                                     {log.protein > 0 && <span className="text-protein-text font-medium">P:{log.protein}</span>}
                                     {log.carbs > 0 && <span className="text-carb font-medium">C:{log.carbs}</span>}
                                     {log.fats > 0 && <span className="text-fat font-medium">F:{log.fats}</span>}
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
              )}
            </motion.div>
          ))}
          </AnimatePresence>
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
