'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Utensils, Image as ImageIcon, Trash2, Edit2, Dumbbell, X } from 'lucide-react';
import { deleteLog, deleteWorkoutLog } from '@/lib/api';
import SegmentedControl from '@/components/ui/SegmentedControl';
import ConfirmModal from './ConfirmModal';
import WorkoutCard from './workout/WorkoutCard';

const VIEW_MODES = [{ label: 'Meals', value: 'meals' }, { label: 'Workouts', value: 'workouts' }];

export default function HistoryView({ logs, workoutLogs = [], user, onLogDeleted, onEditLog }) {
  const [viewMode, setViewMode] = useState('workouts'); // 'meals' | 'workouts'
  const [editingDay, setEditingDay] = useState(null); // { label, logs }
  const [optimisticallyDeletedIds, setOptimisticallyDeletedIds] = useState(new Set());
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: true
  });

  const handleDeleteLog = async (logId, exerciseName = null) => {
    if(!user) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Entry',
      message: 'Are you sure you want to delete this entry? This cannot be undone.',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        
        // Optimistic update
        setOptimisticallyDeletedIds(prev => new Set(prev).add(logId));

        try {
          if (viewMode === 'meals') {
            await deleteLog(logId, user.id);
          } else {
            await deleteWorkoutLog(logId);
            // Clear PR cache if exercise name is provided
            if (exerciseName) {
              localStorage.removeItem(`snapcal_pr_${exerciseName}`);
            }
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

  // Group by date and sort descending
  const groupedLogs = useMemo(() => {
    const currentLogs = (viewMode === 'meals' ? logs : workoutLogs)
      .filter(log => !optimisticallyDeletedIds.has(log.id));
      
    const groups = {};
    
    currentLogs.forEach(log => {
      const dateObj = new Date(log.date);
      const dateKey = dateObj.toLocaleDateString();
      
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateObj,
          logs: []
        };
      }
      groups[dateKey].logs.push(log);
    });

    return Object.values(groups)
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
  }, [logs, workoutLogs, viewMode, optimisticallyDeletedIds]);

  return (
    <div className="p-6 md:p-0 min-h-full pb-20 md:pb-0">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <h2 className="text-2xl font-bold text-foreground">History</h2>

        <SegmentedControl options={VIEW_MODES} value={viewMode} onChange={setViewMode} />
      </div>

      {/* Edit Workout Modal */}
      {editingDay && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in slide-in-from-bottom-10">
          <div className="bg-card border-b border-border pt-safe shrink-0">
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">Edit Workout</h2>
                <p className="text-sm text-muted-foreground">{editingDay.label}</p>
              </div>
              <button
                onClick={() => {
                  setEditingDay(null);
                  if (onLogDeleted) onLogDeleted(); // Refresh parent data
                }}
                className="p-2 bg-muted rounded-full text-muted-foreground hover:bg-muted/80 transition-colors"
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
                          <p className="text-xs text-faint">{log.calories} cal</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-2">
                        <button
                          onClick={() => onEditLog(log)}
                          className="p-2 text-faint hover:text-training-text hover:bg-training-soft rounded-lg transition-colors"
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
                           className="p-2 text-faint hover:text-destructive-text hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                  </div>
                ))
              )}
              {editingDay.logs.length === 0 && (
                <div className="text-center py-12 text-faint">
                  <p>No entries left in this session.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {groupedLogs.length === 0 ? (
         <div className="flex flex-col items-center justify-center h-64 text-faint bg-card rounded-2xl border border-border">
           {viewMode === 'meals' ? (
             <Utensils className="w-12 h-12 mb-2 opacity-20" />
           ) : (
             <Dumbbell className="w-12 h-12 mb-2 opacity-20" />
           )}
           <p>No {viewMode} logged yet</p>
         </div>
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
              <h3 className="text-xs font-bold text-faint uppercase tracking-wider mb-3 sticky top-0 bg-background/90 backdrop-blur py-2 z-10">
                {label}
              </h3>

              {viewMode === 'workouts' ? (
                // Grouped Workout Card
                <div className="bg-card rounded-2xl border border-border overflow-hidden p-5">
                  <div className="flex justify-between items-center mb-4 border-b border-border pb-4">
                    <div>
                      <h4 className="font-bold text-foreground text-lg">Workout Session</h4>
                      <p className="text-xs text-faint">
                        {dayLogs.length} Exercises • {formatDuration(dayLogs[0]?.duration)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingDay({ label, logs: dayLogs })}
                        className="p-2 text-faint hover:text-training-text hover:bg-training-soft rounded-lg transition-colors"
                        title="Edit Session"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDayWorkout(dayLogs)}
                        className="p-2 text-faint hover:text-destructive-text hover:bg-destructive/10 rounded-lg transition-colors"
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
                              <p className="text-xs text-faint">{log.sets?.length || 0} Sets</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-faint uppercase font-bold tracking-wider mb-0.5">Best Set</p>
                            <p className="font-mono text-sm font-medium text-foreground">
                              {bestSet ? `${bestSet.weight}lbs × ${bestSet.reps}` : '-'}
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
                      <h4 className="font-bold text-foreground text-lg">Daily Nutrition</h4>
                      <p className="text-xs text-faint">
                        {dayLogs.length} Meals • {dayLogs.reduce((sum, item) => sum + (parseInt(item.calories)||0), 0)} Calories
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingDay({ label, logs: dayLogs })}
                        className="p-2 text-faint hover:text-training-text hover:bg-training-soft rounded-lg transition-colors"
                        title="Edit Meals"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDayMeals(dayLogs)}
                        className="p-2 text-faint hover:text-destructive-text hover:bg-destructive/10 rounded-lg transition-colors"
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
                             <p className="text-xs text-faint flex flex-wrap gap-2">
                               <span>{new Date(log.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                               {(log.protein || log.carbs || log.fats) && (
                                 <>
                                   <span className="text-faint">•</span>
                                   <span className="flex gap-1">
                                     {log.protein > 0 && <span className="text-deficit font-medium">P:{log.protein}</span>}
                                     {log.carbs > 0 && <span className="text-carb font-medium">C:{log.carbs}</span>}
                                     {log.fats > 0 && <span className="text-fat font-medium">F:{log.fats}</span>}
                                   </span>
                                 </>
                               )}
                             </p>
                           </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-sm font-medium text-foreground">{log.calories} cal</span>
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
      />
    </div>
  );
}
