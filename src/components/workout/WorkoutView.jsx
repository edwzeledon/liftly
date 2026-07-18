import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dumbbell, Plus, Save, Ban, Check, Trophy, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import WorkoutCard from './WorkoutCard';
import PickerView from './PickerView';
import StartLaunchpad, { recordRoutineUse, LaunchpadSkeleton } from './StartLaunchpad';
import SessionTimer from './SessionTimer';
import ConfirmModal from '../ConfirmModal';

import { getExercises } from '@/lib/api';
import { logsVolume, lastWorkoutSession, recentExercises } from '@/lib/workoutStats';
import { toDisplayVolume } from '@/lib/units';
import { useToast } from '@/hooks/useToast';
import { useModalBehavior } from '@/hooks/useModalBehavior';

export default function WorkoutView({ user, onWorkoutComplete, initialLogs = [], onUpdateLogs, weightUnit = 'lb', historyLogs = [], workoutsReady = true }) {
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

  const { toastEl, showToast } = useToast();
  const [showPicker, setShowPicker] = useState(false);
  const [completedAnimation, setCompletedAnimation] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [allExercises, setAllExercises] = useState([]);
  const [exercisesLoading, setExercisesLoading] = useState(true);
  const [exercisesError, setExercisesError] = useState(null);

  // Session start timestamp for the sticky-header timer. A ref, not state:
  // SessionTimer now owns its own 1s tick internally (see SessionTimer.jsx), so
  // WorkoutView no longer needs to re-render every second just to show elapsed
  // time. Derived synchronously in render (not an effect) from workoutLogs[0]'s
  // persisted date — same source the old ticking-state version used — so the
  // very first render that shows the sticky header already has a valid
  // startedAt; an effect would run one tick after the render and could leave
  // SessionTimer reading a stale/null value until some unrelated re-render.
  // No pause/resume/accumulated-offset state existed in the prior
  // implementation — elapsed time was always freshly derived from the first
  // log's timestamp (that's what gave it reload/cross-device persistence), so
  // there is nothing to preserve beyond that derivation.
  const sessionStartRef = useRef(null);
  if (workoutLogs.length > 0 && !showSummary) {
    sessionStartRef.current = new Date(workoutLogs[0].date).getTime();
  } else if (workoutLogs.length === 0) {
    sessionStartRef.current = null;
  }
  
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
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState([]);

  // Escape/scroll-lock/focus for the three inline overlays. Always-mounted
  // component with per-overlay open booleans; the close handlers are referenced
  // via inline arrows so these can sit above their definitions. Only one of the
  // three is ever open at a time, so their Escape listeners never overlap.
  const { closeRef: summaryCloseRef } = useModalBehavior(showSummary, () => closeSummary());
  const { closeRef: saveTemplateCloseRef } = useModalBehavior(showSaveTemplate, () => setShowSaveTemplate(false));

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
    setExercisesLoading(true);
    setExercisesError(null);

    const cacheKey = 'snapcal_exercises_list';
    const cached = localStorage.getItem(cacheKey);

    // Use cache if available
    if (cached) {
      try {
        setAllExercises(JSON.parse(cached));
        setExercisesLoading(false);
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
      setExercisesError("Couldn't load exercises. Check your connection and try again.");
    } finally {
      setExercisesLoading(false);
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
    
    // 1. Immediate UI Update: add temp card (picker stays open for multi-add)
    const tempId = `temp-${Date.now()}`;
    const tempLog = {
      id: tempId,
      exercise_name: exercise.name,
      category: exercise.category,
      sets: [{ weight: '', reps: '', completed: false }], // Default empty sets
      date: new Date().toISOString(),
      __userEditedSets: []
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
    
    // Update with history data, but preserve any user edits
    setWorkoutLogs(prev => prev.map(log => {
      if (log.id !== tempId) return log;
      
      // Get user-edited sets from the log
      const userEditedSets = log.__userEditedSets || [];
      
      // Merge: use history for untouched sets, keep user edits for touched sets
      const mergedSets = initialSets.map((historySet, index) => {
        // If user has edited this set, preserve their current values
        if (userEditedSets.includes(index) && log.sets[index]) {
          return log.sets[index];
        }
        // Otherwise use history data
        return historySet;
      });
      
      return { ...log, sets: mergedSets };
    }));

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
        
        // Replace temp card with real DB data, merging any pending user edits
        setWorkoutLogs(prev => prev.map(log => {
          if (log.id !== tempId) return log;
          
          // If user made edits while we were loading, preserve them
          const userEditedSets = log.__userEditedSets || [];
          if (userEditedSets.length > 0) {
            // Merge user edits into the new log
            const mergedSets = newLog.sets.map((dbSet, index) => {
              if (userEditedSets.includes(index) && log.sets[index]) {
                return log.sets[index];
              }
              return dbSet;
            });
            return { ...newLog, sets: mergedSets };
          }
          
          return newLog;
        }));
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
      confirmLabel: 'Delete',
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

  const lastSession = useMemo(() => lastWorkoutSession(historyLogs), [historyLogs]);

  const handleRepeatLast = () => {
    if (lastSession) handleLoadTemplate({ exercises: lastSession.exercises });
  };

  const handleStartTemplate = (template) => {
    recordRoutineUse(template.id);
    handleLoadTemplate(template);
  };

  const recent = useMemo(() => recentExercises(historyLogs), [historyLogs]);
  const addedNames = useMemo(
    () => new Set(workoutLogs.map((l) => l.exercise || l.exercise_name).filter(Boolean)),
    [workoutLogs]
  );

  const deleteWorkout = async (id) => {
    if (!user) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Remove Exercise',
      message: 'Are you sure you want to remove this exercise from your workout?',
      isDestructive: true,
      confirmLabel: 'Remove',
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
        // (sessionStartRef resets itself on the next render once workoutLogs is empty)
        if (newLogs.length === 0) {
            localStorage.removeItem('snapcal_activeWorkoutLogs');
        }

        try {
          const res = await fetch(`/api/workouts/logs/${id}`, {
            method: 'DELETE'
          });
          if (!res.ok) {
            // Revert on failure
            setWorkoutLogs(previousLogs);
            showToast({ message: "Couldn't delete exercise", variant: 'error' });
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
          showToast({ message: "Couldn't delete exercise", variant: 'error' });
        }
      }
    });
  }

  // Summary State
  const [summaryData, setSummaryData] = useState({ duration: 0, count: 0, volume: 0 });
  const [isFinishing, setIsFinishing] = useState(false);
  // Reentrancy guard for submitWorkout. A ref (not the isFinishing state) because
  // the Retry toast action holds a stale closure whose isFinishing snapshot is
  // always false — the ref is read live, so a double-tapped Retry can't double-POST.
  const finishingRef = useRef(false);

  const submitWorkout = async () => {
    if (!user) return;
    if (finishingRef.current) return; // already in flight — ignore reentrant calls
    finishingRef.current = true;
    setIsFinishing(true);
    // Captured once, up front, so the duration sent to /finish and the duration
    // shown in the summary modal are the exact same number (previously both
    // read the same ticking `elapsedTime` state; now both read this one value).
    const sessionDuration = Math.floor((Date.now() - (sessionStartRef.current ?? Date.now())) / 1000);
    try {
      // 1. Prune incomplete sets and delete empty logs
      const results = await Promise.all(workoutLogs.map(async (log) => {
        const completedSets = log.sets.filter(s => s.completed);
        
        if (completedSets.length === 0) {
            // No completed sets, delete the log
            await fetch(`/api/workouts/logs/${log.id}`, { method: 'DELETE' });
            return null;
        } else {
            // Has completed sets, update if needed
            if (completedSets.length !== log.sets.length) {
                 await fetch(`/api/workouts/logs/${log.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sets: completedSets })
                 });
            }
            return log.id;
        }
      }));

      const validLogIds = results.filter(id => id !== null);

      // 2. Check if we have any valid logs left
      if (validLogIds.length === 0) {
          // No valid logs, delete the session entirely
          await fetch('/api/workouts/active-session', { method: 'DELETE' });

          // Clear local cache (sessionStartRef resets itself once workoutLogs is empty)
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('snapcal_history_')) {
                localStorage.removeItem(key);
            }
          });
          if (onWorkoutComplete) onWorkoutComplete();
          return;
      }

      const res = await fetch('/api/workouts/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: sessionDuration,
          ids: validLogIds,
          localDate: new Date().toLocaleDateString('en-CA')
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
          duration: sessionDuration,
          count: workoutLogs.length,
          records: recordsCount,
          // Volume of work actually saved: completed sets only (incomplete sets are
          // discarded on finish). Reuses the shared logsVolume helper — no new state.
          volume: logsVolume(workoutLogs.map(l => ({ ...l, sets: (l.sets || []).filter(s => s.completed) })))
        });
        
        setCompletedAnimation(true);
        setShowSummary(true);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        
        // Trigger Celebration Confetti — skipped under prefers-reduced-motion.
        // canvas-confetti is a raw canvas particle burst outside Tailwind's
        // motion-reduce variant system; full-viewport particles for 2s are
        // exactly the large-scale motion that preference exists to suppress.
        // The trophy/summary UI still conveys the celebration without it.
        const reduceMotion = typeof window !== 'undefined' &&
          window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

        if (!reduceMotion) {
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
        }

        // Clear workout history caches so next workout gets fresh data
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('snapcal_history_')) {
            localStorage.removeItem(key);
          }
        });
        
        if (onWorkoutComplete) onWorkoutComplete();
      } else {
        // Finish failed: leave the session fully intact (logs kept, timer still
        // running) and offer a Retry. submitWorkout is safe to call again — the
        // prune/delete steps are idempotent and no state has been cleared.
        console.error("Failed to finish workout", res.status);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        showToast({
          message: "Couldn't save your workout",
          variant: 'error',
          action: { label: 'Retry', onAction: submitWorkout },
        });
      }
    } catch (e) {
      console.error("Error finishing workout", e);
      // Network/throw failure: session state is untouched; let the user retry.
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
      showToast({
        message: "Couldn't save your workout",
        variant: 'error',
        action: { label: 'Retry', onAction: submitWorkout },
      });
    } finally {
      finishingRef.current = false;
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
        confirmLabel: 'Finish Anyway',
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
        confirmLabel: 'Finish',
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
  };

  const handleDiscardWorkout = async () => {
    if (!user) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Discard Workout',
      message: "Are you sure you want to discard today's entire workout? This cannot be undone.",
      isDestructive: true,
      confirmLabel: 'Discard',
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
        // (sessionStartRef resets itself on the next render once workoutLogs is empty)
        setWorkoutLogs([]);
        localStorage.removeItem('snapcal_activeWorkoutLogs');

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
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-card/90 backdrop-blur-sm animate-in fade-in duration-500">
          <Trophy className="w-24 h-24 text-streak mb-4 animate-bounce motion-reduce:animate-none" />
          <h2 className="text-3xl font-bold text-foreground">Workout Complete!</h2>
          <p className="text-muted-foreground">Great job crushing your goals today.</p>
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
        isLoading={isFinishing}
      />

      {/* Summary Modal */}
      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={closeSummary}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm animate-in zoom-in-95 flex flex-col items-center text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-20 h-20 bg-streak-soft rounded-full flex items-center justify-center mb-4">
              <Trophy className="w-10 h-10 text-streak" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">You Crushed It!</h2>
            <p className="text-muted-foreground mb-6">Here&apos;s your summary:</p>

            <div className="grid grid-cols-3 gap-3 w-full mb-6">
              <div className="bg-muted rounded-xl p-3 text-center">
                <p className="font-display text-2xl font-bold tabular-nums text-foreground">{formatTime(summaryData.duration)}</p>
                <p className="text-xs text-muted-foreground">Duration</p>
              </div>
              <div className="bg-muted rounded-xl p-3 text-center">
                <p className="font-display text-2xl font-bold tabular-nums text-foreground">{summaryData.count}</p>
                <p className="text-xs text-muted-foreground">Exercises</p>
              </div>
              <div className="bg-muted rounded-xl p-3 text-center">
                <p className="font-display text-2xl font-bold tabular-nums text-foreground">{toDisplayVolume(summaryData.volume || 0, weightUnit).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Volume</p>
              </div>
            </div>
            
            {/* New Records Section */}
            {summaryData.records > 0 && (
              <div className="w-full bg-streak-soft p-4 rounded-2xl mb-6 flex items-center justify-between animate-in zoom-in-95 duration-500 delay-150">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-streak-soft rounded-full text-streak">
                     <Trophy className="w-5 h-5" />
                   </div>
                   <div className="text-left">
                     <p className="font-bold text-foreground">New Records</p>
                     <p className="text-xs text-muted-foreground">Personal Bests Crushed</p>
                   </div>
                 </div>
                 <span className="text-2xl font-bold text-streak">{summaryData.records}</span>
              </div>
            )}

            <button
              ref={summaryCloseRef}
              onClick={closeSummary}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 active:scale-95 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showSaveTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowSaveTemplate(false)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-foreground mb-4">Save Routine</h3>
            <input
              ref={saveTemplateCloseRef}
              type="text"
              placeholder="Routine Name (e.g., Leg Day)"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border mb-4 focus:border-ring outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowSaveTemplate(false)}
                className="flex-1 py-3 bg-muted text-muted-foreground rounded-xl font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveTemplate}
                disabled={!templateName.trim() || isSavingTemplate}
                className="flex-1 py-3 bg-training text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
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

      {/* Sticky Active Session header (sticks to the page <main> scroll container).
          -mx / px cancel the WorkoutView root padding (p-6 / md:p-8) so the bar is
          edge-to-edge with no horizontal scrollbar; inner content stays aligned to
          the md:max-w-xl list column below. */}
      {!showPicker && workoutLogs.length > 0 && (
        <div className="sticky top-0 z-10 -mx-6 md:-mx-8 px-6 md:px-8 py-3 mb-6 bg-background/90 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between md:max-w-xl w-full md:mx-auto">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">Active Session</h2>
              <SessionTimer
                startedAt={sessionStartRef.current ?? Date.now()}
                className="font-display text-2xl font-bold text-training-text leading-none"
              />
            </div>

            {/* Finish Workout — handler + disabled logic preserved; classes restyled */}
            <button
              onClick={handleCompleteWorkout}
              disabled={!workoutLogs.some(log => log.sets.some(s => s.completed))}
              className={`rounded-xl font-bold transition-all flex items-center gap-2 px-5 py-2.5 ${
                !workoutLogs.some(log => log.sets.some(s => s.completed))
                  ? 'bg-muted text-faint cursor-not-allowed'
                  : 'bg-training text-white active:scale-95'
              }`}
            >
              <Check className="w-4 h-4" />
              Finish
            </button>
          </div>
        </div>
      )}

      {!showPicker && workoutLogs.length === 0 && (
        <div className="flex items-center justify-between mb-6 md:max-w-xl w-full md:mx-auto">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Dumbbell className="w-6 h-6 text-training-text" />
              Train
            </h2>
          </div>
        </div>
      )}

      {showPicker ? (
        <PickerView
          onBack={() => setShowPicker(false)}
          onDone={() => setShowPicker(false)}
          onAddExercise={handleAddExerciseToDay}
          exercises={allExercises}
          loading={exercisesLoading}
          error={exercisesError}
          onRetry={fetchExercises}
          recent={recent}
          addedNames={addedNames}
          addedCount={workoutLogs.length}
        />
      ) : (
        <div className="flex flex-col h-full">
          {/* Today's List */}
          <div className="flex-1 overflow-y-auto space-y-4 pb-4 no-scrollbar md:max-w-xl w-full md:mx-auto">
             {workoutLogs.length === 0 ? (
               !workoutsReady ? (
                 <LaunchpadSkeleton />
               ) : (
               <StartLaunchpad
                 templates={templates}
                 lastSession={lastSession}
                 weightUnit={weightUnit}
                 isLoading={isLoadingTemplate}
                 onRepeatLast={handleRepeatLast}
                 onStartTemplate={handleStartTemplate}
                 onDeleteTemplate={deleteTemplate}
                 onAddExercise={() => setShowPicker(true)}
               />
               )
             ) : (
               <>
                 {workoutLogs.map(log => (
                   <WorkoutCard
                      key={log.id}
                      log={log}
                      onDelete={deleteWorkout}
                      onUpdate={handleUpdateLog}
                      weightUnit={weightUnit}
                   />
                 ))}

                 {/* Add Buttons Row */}
                 <div className="flex gap-2">
                   <button
                     onClick={() => setShowPicker(true)}
                     className="flex-1 py-4 border-2 border-dashed border-training-soft-border rounded-2xl text-training-text font-bold hover:bg-training-soft hover:border-training-text/40 transition-all flex items-center justify-center gap-2"
                   >
                     <Plus className="w-5 h-5" />
                     Add Exercise
                   </button>
                 </div>

                 {/* Discard & Save Actions */}
                 <div className="pt-8 pb-4 flex flex-col gap-3">
                   <button
                     onClick={() => setShowSaveTemplate(true)}
                     className="w-full py-3 bg-card border border-border text-muted-foreground rounded-xl font-bold hover:bg-muted transition-all flex items-center justify-center gap-2 text-sm"
                   >
                     <Save className="w-4 h-4" />
                     Save as Template
                   </button>
                   <button 
                     onClick={handleDiscardWorkout}
                     className="w-full py-3 bg-destructive text-white rounded-xl font-bold hover:bg-destructive/90 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
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

      {toastEl}
    </div>
  );
}
