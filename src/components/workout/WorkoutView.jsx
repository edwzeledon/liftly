import React, { useState, useEffect, useMemo } from 'react';
import { Dumbbell, Plus, Download, Folder, Save, Ban, Check, Trophy, X, Play, Trash2, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import WorkoutCard from './WorkoutCard';
import PickerView from './PickerView';
import ConfirmModal from '../ConfirmModal';

import { getExercises } from '@/lib/api';

export default function WorkoutView({ user, onWorkoutComplete, initialLogs = [], onUpdateLogs }) {
  // Use props for logs if available, otherwise fallback to local state (though props should always be there now)
  const [localLogs, setLocalLogs] = useState([]);
  const workoutLogs = onUpdateLogs ? initialLogs : localLogs;
  
  const setWorkoutLogs = (newLogsOrFn) => {
    if (onUpdateLogs) {
      // Handle functional updates if passed
      if (typeof newLogsOrFn === 'function') {
        onUpdateLogs(prev => newLogsOrFn(prev));
      } else {
        onUpdateLogs(newLogsOrFn);
      }
    } else {
      setLocalLogs(newLogsOrFn);
    }
  };

  const [showPicker, setShowPicker] = useState(false);
  const [completedAnimation, setCompletedAnimation] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);
  const [allExercises, setAllExercises] = useState([]);
  
  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDestructive: true
  });

  // Template States
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showLoadTemplate, setShowLoadTemplate] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState([]);

  // Fetch Logs
  const fetchLogs = async () => {
    if (!user) return;
    try {
      // Fetch only active logs for the current session
      const res = await fetch(`/api/workouts/logs`);
      if (res.ok) {
        const data = await res.json();
        setWorkoutLogs(data);
      }
    } catch (e) {
      console.error("Error fetching logs", e);
    }
  };

  // Timer Logic
  useEffect(() => {
    if (workoutLogs.length > 0 && !showSummary) {
      // Use the timestamp of the first exercise as the start time
      // This ensures persistence across reloads/devices
      const startTime = new Date(workoutLogs[0].date).getTime();
      
      const updateTimer = () => {
        const now = Date.now();
        const seconds = Math.floor((now - startTime) / 1000);
        setElapsedTime(seconds > 0 ? seconds : 0);
      };

      updateTimer(); // Immediate update
      
      // Clear any existing interval
      if (timerInterval) clearInterval(timerInterval);

      const interval = setInterval(updateTimer, 1000);
      setTimerInterval(interval);

      return () => clearInterval(interval);
    } else if (showSummary) {
      // Stop timer but keep elapsed time for summary display
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
    } else {
      // Reset if no logs and not showing summary
      setElapsedTime(0);
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
    }
  }, [workoutLogs, showSummary]);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch Templates (cached)
  const fetchTemplates = async (forceRefetch = false) => {
    if (!user) return;
    
    const cacheKey = 'snapcal_workout_templates';
    const cached = localStorage.getItem(cacheKey);
    
    // Use cache if available and not forcing refetch
    if (!forceRefetch && cached) {
      try {
        setTemplates(JSON.parse(cached));
        return;
      } catch (e) {
        console.error("Error parsing cached templates", e);
      }
    }
    
    // Fetch from API
    try {
      const res = await fetch('/api/workouts/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
        localStorage.setItem(cacheKey, JSON.stringify(data));
      }
    } catch (e) {
      console.error("Error fetching templates", e);
    }
  };

  const fetchExercises = async () => {
    const cacheKey = 'snapcal_exercises_list';
    const cached = localStorage.getItem(cacheKey);
    
    // Use cache if available
    if (cached) {
      try {
        setAllExercises(JSON.parse(cached));
        return;
      } catch (e) {
        console.error("Error parsing cached exercises", e);
      }
    }
    
    // Fetch from API and cache
    try {
      const data = await getExercises();
      setAllExercises(data);
      localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to load exercises", error);
    }
  };

  useEffect(() => {
    // Only fetch logs if we are NOT using parent state (fallback)
    if (!onUpdateLogs) {
      fetchLogs();
    }
    fetchTemplates();
    fetchExercises();
  }, [user]);

  const handleAddExerciseToDay = async (exercise) => {
    if (!user) return;
    
    // 1. Immediate UI Update: Close picker and add temp card
    setShowPicker(false);
    const tempId = `temp-${Date.now()}`;
    const tempLog = {
      id: tempId,
      exercise_name: exercise.name,
      category: exercise.category,
      sets: [{ weight: '', reps: '', completed: false }], // Default empty sets
      date: new Date().toISOString()
    };
    setWorkoutLogs(prev => [...prev, tempLog]);

    // 2. Fetch history (cached) - combined endpoint for best + last
    let initialSets = [{ weight: '', reps: '', completed: false }];
    const cacheKey = `snapcal_history_${exercise.name}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      // Use cached data
      try {
        const cachedData = JSON.parse(cached);
        if (cachedData.last && cachedData.last.sets && cachedData.last.sets.length > 0) {
          initialSets = cachedData.last.sets.map(s => ({
            weight: s.weight,
            reps: s.reps,
            completed: false
          }));
        }
      } catch (e) {
        console.error("Error parsing cached history", e);
      }
    } else {
      // Fetch and cache (combines best + last in one request)
      try {
        const res = await fetch(`/api/workouts/history?exercise=${encodeURIComponent(exercise.name)}`);
        if (res.ok) {
          const historyData = await res.json();
          if (historyData.last && historyData.last.sets && historyData.last.sets.length > 0) {
            initialSets = historyData.last.sets.map(s => ({
              weight: s.weight,
              reps: s.reps,
              completed: false
            }));
          }
          localStorage.setItem(cacheKey, JSON.stringify(historyData));
        }
      } catch (e) {
        console.error("Error fetching history", e);
      }
    }
    
    // Update with history data
    setWorkoutLogs(prev => prev.map(log => 
      log.id === tempId ? { ...log, sets: initialSets } : log
    ));

    // 3. Persist to DB
    try {
      const res = await fetch('/api/workouts/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise: exercise.name,
          category: exercise.category,
          sets: initialSets,
          date: new Date().toISOString()
        })
      });
      
      if (res.ok) {
        const newLog = await res.json();
        // Replace temp card with real DB data
        setWorkoutLogs(prev => prev.map(log => log.id === tempId ? newLog : log));
      } else {
        // Revert if failed
        setWorkoutLogs(prev => prev.filter(log => log.id !== tempId));
        console.error("Failed to add workout");
      }
    } catch (e) {
      console.error("Error creating workout entry", e);
      setWorkoutLogs(prev => prev.filter(log => log.id !== tempId));
    }
  };

  const handleSaveTemplate = async () => {
    if (!user || !templateName.trim() || workoutLogs.length === 0) return;
    
    setIsSavingTemplate(true);
    try {
      const res = await fetch('/api/workouts/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          exercises: workoutLogs.map(l => ({ 
            exercise: l.exercise_name || l.exercise, 
            category: l.category, 
            sets: l.sets.map(s => ({ weight: '', reps: '', completed: false })) 
          }))
        })
      });

      if (res.ok) {
        setTemplateName('');
        setShowSaveTemplate(false);
        fetchTemplates(true); // Force refetch after save
      }
    } catch (e) {
      console.error("Error saving template", e);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleLoadTemplate = async (template) => {
    if (!user || !template.exercises || template.exercises.length === 0) return;
    
    setIsLoadingTemplate(true);

    // Helper to process a single exercise
    const processExercise = async (ex) => {
      // Fetch history for prefill (cached) - combined endpoint
      let setsToUse = ex.sets;
      const cacheKey = `snapcal_history_${ex.exercise}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        // Use cached data
        try {
          const historyData = JSON.parse(cached);
          if (historyData.last && historyData.last.sets) {
            setsToUse = ex.sets.map((templateSet, index) => {
              const historySet = historyData.last.sets[index];
              return {
                ...templateSet,
                weight: historySet ? historySet.weight : '',
                reps: historySet ? historySet.reps : '',
                completed: false
              };
            });
          }
        } catch (e) {
          console.error("Error parsing cached history", e);
        }
      } else {
        // Fetch and cache (combines best + last in one request)
        try {
          const res = await fetch(`/api/workouts/history?exercise=${encodeURIComponent(ex.exercise)}`);
          if (res.ok) {
            const historyData = await res.json();
            if (historyData.last && historyData.last.sets) {
              setsToUse = ex.sets.map((templateSet, index) => {
                const historySet = historyData.last.sets[index];
                return {
                  ...templateSet,
                  weight: historySet ? historySet.weight : '',
                  reps: historySet ? historySet.reps : '',
                  completed: false
                };
              });
            }
            localStorage.setItem(cacheKey, JSON.stringify(historyData));
          }
        } catch (e) {
          console.error("Error fetching history for template load", e);
        }
      }

      return fetch('/api/workouts/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise: ex.exercise,
          category: ex.category,
          sets: setsToUse,
          date: new Date().toISOString()
        })
      });
    };

    try {
      // 1. Process first exercise to ensure session creation
      await processExercise(template.exercises[0]);

      // 2. Process remaining exercises in parallel
      if (template.exercises.length > 1) {
        const remainingExercises = template.exercises.slice(1);
        const promises = remainingExercises.map(ex => processExercise(ex));
        await Promise.all(promises);
      }

      await fetchLogs();
      setShowLoadTemplate(false);
    } catch (e) {
      console.error("Error loading template", e);
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  const deleteTemplate = async (id) => {
    if (!user) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Template',
      message: 'Are you sure you want to delete this workout template? This cannot be undone.',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        
        // Optimistic update
        const previousTemplates = [...templates];
        setTemplates(prev => prev.filter(t => t.id !== id));

        try {
          const res = await fetch(`/api/workouts/templates/${id}`, {
            method: 'DELETE'
          });
          if (!res.ok) {
            // Revert on failure
            setTemplates(previousTemplates);
            console.error("Failed to delete template");
          } else {
            // Update cache on success
            localStorage.setItem('snapcal_workout_templates', JSON.stringify(templates.filter(t => t.id !== id)));
          }
        } catch (e) {
          console.error("Error deleting template", e);
          setTemplates(previousTemplates);
        }
      }
    });
  }

  const deleteWorkout = async (id) => {
    if (!user) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Remove Exercise',
      message: 'Are you sure you want to remove this exercise from your workout?',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        
        // Find the log to get the exercise name for cache clearing
        const logToDelete = workoutLogs.find(log => log.id === id);
        if (logToDelete) {
            const exerciseName = logToDelete.exercise_name || logToDelete.exercise;
            if (exerciseName) {
                localStorage.removeItem(`snapcal_pr_${exerciseName}`);
            }
        }

        // Optimistic update
        const previousLogs = [...workoutLogs];
        const newLogs = previousLogs.filter(log => log.id !== id);
        setWorkoutLogs(newLogs);

        // If this was the last exercise, clean up session state locally
        if (newLogs.length === 0) {
            localStorage.removeItem('snapcal_activeWorkoutLogs');
            setElapsedTime(0);
            if (timerInterval) {
                clearInterval(timerInterval);
                setTimerInterval(null);
            }
        }

        try {
          const res = await fetch(`/api/workouts/logs/${id}`, {
            method: 'DELETE'
          });
          if (!res.ok) {
            // Revert on failure
            setWorkoutLogs(previousLogs);
            alert("Failed to delete workout");
            return;
          }

          // If we just deleted the last log, also delete the session on server
          if (newLogs.length === 0) {
             await fetch('/api/workouts/active-session', { method: 'DELETE' });
          }
        } catch (e) {
          // Revert on error
          setWorkoutLogs(previousLogs);
          console.error("Error deleting workout", e);
        }
      }
    });
  }

  // Summary State
  const [summaryData, setSummaryData] = useState({ duration: 0, count: 0 });
  const [isFinishing, setIsFinishing] = useState(false);

  const submitWorkout = async () => {
    if (!user) return;
    setIsFinishing(true);
    try {
      // 1. Prune incomplete sets for each log before finishing
      // This ensures only "Done" sets are saved to history
      const updatePromises = workoutLogs.map(log => {
        const completedSets = log.sets.filter(s => s.completed);
        // Only update if we are actually removing incomplete sets
        if (completedSets.length !== log.sets.length) {
             return fetch(`/api/workouts/logs/${log.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sets: completedSets })
             });
        }
        return Promise.resolve();
      });

      await Promise.all(updatePromises);

      const res = await fetch('/api/workouts/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          duration: elapsedTime,
          ids: workoutLogs.map(log => log.id)
        })
      });

      if (res.ok) {
        // Calculate Records Hit
        let recordsCount = 0;
        
        // Check each log against cached PRs
        for (const log of workoutLogs) {
          const exerciseName = log.exercise_name || log.exercise;
          if (!exerciseName) continue;
          
          const cacheKey = `snapcal_pr_${exerciseName}`;
          const cached = localStorage.getItem(cacheKey);
          
          if (cached) {
            try {
              const bestSet = JSON.parse(cached);
              const bestW = parseFloat(bestSet.weight) || 0;
              const bestR = parseFloat(bestSet.reps) || 0;
              
              // Check if any set in this log beat the PR
              const beatPR = log.sets.some(set => {
                if (!set.completed) return false;
                const w = parseFloat(set.weight) || 0;
                const r = parseFloat(set.reps) || 0;
                
                if (w > bestW) return true;
                if (w === bestW && r > bestR) return true;
                return false;
              });
              
              if (beatPR) recordsCount++;
            } catch (e) {
              console.error("Error checking PR for summary", e);
            }
          }
        }
        
        // Capture summary data BEFORE clearing logs via onWorkoutComplete
        setSummaryData({
          duration: elapsedTime,
          count: workoutLogs.length,
          records: recordsCount
        });
        
        setCompletedAnimation(true);
        setShowSummary(true);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        
        // Trigger Celebration Confetti
        const duration = 2000;
        const end = Date.now() + duration;

        (function frame() {
          confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#FFD700', '#FFA500', '#6366f1']
          });
          confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#FFD700', '#FFA500', '#6366f1']
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        }());

        if (timerInterval) clearInterval(timerInterval);
        setTimerInterval(null);
        
        // Clear workout history caches so next workout gets fresh data
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('snapcal_history_')) {
            localStorage.removeItem(key);
          }
        });
        
        if (onWorkoutComplete) onWorkoutComplete();
      }
    } catch (e) {
      console.error("Error finishing workout", e);
    } finally {
      setIsFinishing(false);
    }
  };

  const handleCompleteWorkout = async () => {
    // Check for incomplete sets
    const hasIncompleteSets = workoutLogs.some(log => 
      log.sets.some(set => !set.completed)
    );

    if (hasIncompleteSets) {
      setConfirmModal({
        isOpen: true,
        title: 'Incomplete Sets',
        message: 'Any incomplete sets will be discarded. Are you sure you want to finish?',
        isDestructive: false,
        confirmText: 'Finish Anyway',
        onConfirm: async () => {
          await submitWorkout();
        }
      });
    } else {
      // Normal confirmation for complete workout
      setConfirmModal({
        isOpen: true,
        title: 'Finish Workout',
        message: 'Great job! Are you ready to finish this workout?',
        isDestructive: false,
        confirmText: 'Finish',
        onConfirm: async () => {
          await submitWorkout();
        }
      });
    }
  };

  const closeSummary = () => {
    setShowSummary(false);
    setCompletedAnimation(false);
    setWorkoutLogs([]);
    setElapsedTime(0);
  };

  const handleDiscardWorkout = async () => {
    if (!user) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Discard Workout',
      message: "Are you sure you want to discard today's entire workout? This cannot be undone.",
      isDestructive: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        
        // Capture logs to delete (closure captures current state)
        const logsToDelete = workoutLogs;

        // Clear PR Cache for all exercises in the discarded workout
        logsToDelete.forEach(log => {
            const exerciseName = log.exercise_name || log.exercise;
            if (exerciseName) {
                localStorage.removeItem(`snapcal_pr_${exerciseName}`);
            }
        });

        // Optimistic Update: Clear UI immediately
        setWorkoutLogs([]);
        localStorage.removeItem('snapcal_activeWorkoutLogs');
        setElapsedTime(0);
        if (timerInterval) {
            clearInterval(timerInterval);
            setTimerInterval(null);
        }

        try {
          const promises = logsToDelete.map(log => 
            fetch(`/api/workouts/logs/${log.id}`, { method: 'DELETE' })
          );
          await Promise.all(promises);
          
          // Also delete the active session
          await fetch('/api/workouts/active-session', { method: 'DELETE' });
          
          // Sync with server to ensure clean state
          fetchLogs();
        } catch (e) {
          console.error("Error discarding workout", e);
        }
      }
    });
  };

  const handleUpdateLog = (updatedLog) => {
    setWorkoutLogs(prev => prev.map(log => log.id === updatedLog.id ? updatedLog : log));
  };

  return (
    <div className="p-6 md:p-8 h-full flex flex-col md:pb-0 relative">
      
      {/* Celebration Overlay */}
      {completedAnimation && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm animate-in fade-in duration-500">
          <Trophy className="w-24 h-24 text-yellow-500 mb-4 animate-bounce" />
          <h2 className="text-3xl font-bold text-slate-800">Workout Complete!</h2>
          <p className="text-slate-500">Great job crushing your goals today.</p>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        isDestructive={confirmModal.isDestructive}
        confirmText={confirmModal.confirmText}
        isLoading={isFinishing}
      />

      {/* Summary Modal */}
      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm animate-in zoom-in-95 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <Trophy className="w-10 h-10 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">You Crushed It!</h2>
            <p className="text-slate-500 mb-6">Here's your summary:</p>
            
            <div className="grid grid-cols-2 gap-4 w-full mb-6">
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Duration</p>
                <p className="text-xl font-bold text-slate-800">{formatTime(summaryData.duration)}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Exercises</p>
                <p className="text-xl font-bold text-slate-800">{summaryData.count}</p>
              </div>
            </div>
            
            {/* New Records Section */}
            {summaryData.records > 0 && (
              <div className="w-full bg-amber-50 p-4 rounded-2xl mb-6 flex items-center justify-between animate-in zoom-in-95 duration-500 delay-150">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-amber-100 rounded-full text-amber-600">
                     <Trophy className="w-5 h-5" />
                   </div>
                   <div className="text-left">
                     <p className="font-bold text-slate-800">New Records</p>
                     <p className="text-xs text-slate-500">Personal Bests Crushed</p>
                   </div>
                 </div>
                 <span className="text-2xl font-bold text-amber-600">{summaryData.records}</span>
              </div>
            )}

            <button 
              onClick={closeSummary}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 active:scale-95 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showSaveTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Save Routine</h3>
            <input 
              type="text" 
              placeholder="Routine Name (e.g., Leg Day)" 
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 mb-4 focus:border-indigo-500 outline-none"
              autoFocus
            />
            <div className="flex gap-2">
              <button 
                onClick={() => setShowSaveTemplate(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveTemplate}
                disabled={!templateName.trim() || isSavingTemplate}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSavingTemplate ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Template Modal */}
      {showLoadTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm animate-in zoom-in-95 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800">My Routines</h3>
              <button onClick={() => setShowLoadTemplate(false)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2">
              {isLoadingTemplate ? (
                <div className="flex flex-col items-center justify-center py-12 text-indigo-600">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <p className="text-sm font-medium">Loading Routine...</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Folder className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>No saved templates yet.</p>
                </div>
              ) : (
                templates.map(temp => (
                  <div key={temp.id} className="bg-slate-50 p-4 rounded-xl flex items-center justify-between group">
                    <div>
                      <h4 className="font-bold text-slate-700">{temp.name}</h4>
                      <p className="text-xs text-slate-400">{temp.exercises.length} Exercises</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleLoadTemplate(temp)}
                        className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
                        title="Load Routine"
                      >
                        <Play className="w-4 h-4 fill-current" />
                      </button>
                      <button 
                        onClick={() => deleteTemplate(temp.id)}
                        className="p-2 text-slate-300 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {!showPicker && (
        <div className="flex items-center justify-between mb-6 md:max-w-xl w-full md:mx-auto">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Dumbbell className="w-6 h-6 text-indigo-600" />
              Lifting Log
            </h2>
            {workoutLogs.length > 0 && (
              <p className="text-sm font-mono text-indigo-600 font-medium ml-8 mt-1">
                {formatTime(elapsedTime)}
              </p>
            )}
          </div>
          
          {/* Finish Workout moved to top right */}
          {workoutLogs.length > 0 && (
            <button 
              onClick={handleCompleteWorkout}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-2 text-sm"
            >
              <Check className="w-4 h-4" />
              Finish
            </button>
          )}
        </div>
      )}

      {showPicker ? (
        <PickerView 
          onBack={() => setShowPicker(false)} 
          onAddExercise={handleAddExerciseToDay} 
          exercises={allExercises}
        />
      ) : (
        <div className="flex flex-col h-full">
          {/* Today's List */}
          <div className="flex-1 overflow-y-auto space-y-4 pb-4 no-scrollbar md:max-w-xl w-full md:mx-auto">
             {workoutLogs.length === 0 ? (
               <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                 <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                   <Dumbbell className="w-8 h-8 text-indigo-300" />
                 </div>
                 <h3 className="text-lg font-bold text-slate-700 mb-1">Start your Workout</h3>
                 <p className="text-slate-400 text-sm mb-6">Add exercises to build your daily plan.</p>
                 <div className="flex flex-col gap-3 w-full">
                   <button 
                     onClick={() => setShowPicker(true)}
                     className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                   >
                     <Plus className="w-5 h-5" />
                     Add Exercise
                   </button>
                   <button 
                     onClick={() => setShowLoadTemplate(true)}
                     className="w-full px-4 py-3 bg-white border border-indigo-100 text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                   >
                     <Download className="w-5 h-5" />
                     Load Template
                   </button>
                 </div>
               </div>
             ) : (
               <>
                 {workoutLogs.map(log => (
                   <WorkoutCard 
                      key={log.id} 
                      log={log} 
                      onDelete={deleteWorkout} 
                      onUpdate={handleUpdateLog}
                   />
                 ))}

                 {/* Add Buttons Row */}
                 <div className="flex gap-2">
                   <button 
                     onClick={() => setShowPicker(true)}
                     className="flex-1 py-4 border-2 border-dashed border-indigo-200 rounded-2xl text-indigo-500 font-bold hover:bg-indigo-50 hover:border-indigo-300 transition-all flex items-center justify-center gap-2"
                   >
                     <Plus className="w-5 h-5" />
                     Add Exercise
                   </button>
                 </div>

                 {/* Discard & Save Actions */}
                 <div className="pt-8 pb-4 flex flex-col gap-3">
                   <button 
                     onClick={() => setShowSaveTemplate(true)}
                     className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-sm"
                   >
                     <Save className="w-4 h-4" />
                     Save as Template
                   </button>
                   <button 
                     onClick={handleDiscardWorkout}
                     className="w-full py-3 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
                   >
                     <Ban className="w-4 h-4" />
                     Discard
                   </button>
                 </div>
               </>
             )}
          </div>
        </div>
      )}
    </div>
  );
}
