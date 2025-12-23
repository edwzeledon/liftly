import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { CheckCircle, Trash2, Check, X, Plus, Trophy, Calculator } from 'lucide-react';
import confetti from 'canvas-confetti';
import PlateCalculator from './PlateCalculator';

export default function WorkoutCard({ log, onDelete, onUpdate }) {
  const [sets, setSets] = useState(log.sets || []);
  const [bestSet, setBestSet] = useState(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const isTemp = String(log.id).startsWith('temp');
  const abortControllerRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const prevBestSetIndexRef = useRef(-1);
  const setsOnFocusRef = useRef(null);
  const trophyRefs = useRef({});

  // Sync state with props if props change (e.g. initial load)
  useEffect(() => {
    setSets(log.sets || []);
  }, [log.sets]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Fetch Personal Record (Best Set) - uses combined cache
  useEffect(() => {
    const fetchBestSet = async () => {
      const exerciseName = log.exercise_name || log.exercise;
      if (!exerciseName) return;

      const cacheKey = `snapcal_history_${exerciseName}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        // Use cached data (already fetched by WorkoutView)
        try {
          const historyData = JSON.parse(cached);
          setBestSet(historyData.best || null);
        } catch (e) {
          console.error("Error parsing cached history", e);
        }
      } else {
        // Fetch and cache if not already cached (fallback)
        try {
          const res = await fetch(`/api/workouts/history?exercise=${encodeURIComponent(exerciseName)}`);
          if (res.ok) {
            const historyData = await res.json();
            setBestSet(historyData.best || null);
            localStorage.setItem(cacheKey, JSON.stringify(historyData));
          }
        } catch (e) {
          console.error("Error fetching history", e);
        }
      }
    };
    fetchBestSet();
  }, [log.exercise_name, log.exercise]);

  const handleApplyWeight = (weight) => {
    if (sets.length > 0) {
      // Apply to ALL sets
      const newSets = sets.map(set => ({
        ...set,
        weight: weight
      }));
      setSets(newSets);
      updateParent(newSets);
      saveSets(newSets); // debounced
    } else {
      // If no sets, create one
      const newSets = [{ weight: weight, reps: '', completed: false }];
      setSets(newSets);
      updateParent(newSets);
      saveSets(newSets); // debounced
    }
    setShowCalculator(false);
  };

  const isNewRecord = (weight, reps) => {
    if (!bestSet) return false;
    const w = parseFloat(weight) || 0;
    const r = parseFloat(reps) || 0;
    const bestW = parseFloat(bestSet.weight) || 0;
    const bestR = parseFloat(bestSet.reps) || 0;

    if (w > bestW) return true;
    if (w === bestW && r > bestR) return true;
    return false;
  };

  const updateParent = (newSets) => {
    if (onUpdate) {
      onUpdate({ ...log, sets: newSets });
    }
  };

  const performSave = useCallback(async (newSets) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Only save completed sets to the database
    const completedSets = newSets.filter(s => s.completed);

    try {
      const response = await fetch(`/api/workouts/logs/${log.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sets: completedSets }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error('Failed to save sets');
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error("Error saving sets:", e);
      }
    }
  }, [log.id]);

  const saveSets = useCallback((newSets, immediate = false) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // If immediate (e.g., marking complete), save right away
    if (immediate) {
      performSave(newSets);
      return;
    }

    // Otherwise, debounce for 2 seconds
    saveTimeoutRef.current = setTimeout(() => {
      performSave(newSets);
    }, 2000);
  }, [performSave]);

  const addSet = () => {
    let previousWeight = '';
    let previousReps = '';

    if (sets.length > 0) {
      const lastSet = sets[sets.length - 1];
      previousWeight = lastSet.weight;
      previousReps = lastSet.reps;
    }

    const newSets = [...sets, { weight: previousWeight, reps: previousReps, completed: false }];
    setSets(newSets);
    updateParent(newSets);
    saveSets(newSets, true); // immediate = true
  };

  const updateSet = (index, field, value) => {
    // Sanitize input to allow only numbers and one decimal point
    if (value && !/^\d*\.?\d*$/.test(value)) return;

    const newSets = [...sets];
    newSets[index][field] = value;
    setSets(newSets);
    updateParent(newSets);
  };

  const handleBlur = () => {
    // Only save if data actually changed
    if (setsOnFocusRef.current && JSON.stringify(sets) !== JSON.stringify(setsOnFocusRef.current)) {
      updateParent(sets);
      saveSets(sets);
    }
    setsOnFocusRef.current = null;
  };

  const handleFocus = () => {
    // Capture current sets state when input is focused
    setsOnFocusRef.current = JSON.parse(JSON.stringify(sets));
  };

  const toggleSetCompletion = (index) => {
    const set = sets[index];
    // Validation: Can only mark as done if both fields are filled
    if (!set.completed) {
      if (!set.weight || !set.reps) {
        return; // Do nothing if incomplete
      }
    }

    const newSets = [...sets];
    newSets[index].completed = !newSets[index].completed;
    setSets(newSets);
    updateParent(newSets);
    saveSets(newSets, true); // immediate = true
  };

  const quickFinish = () => {
    const allCompleted = sets.length > 0 && sets.every(s => s.completed);
    const targetState = !allCompleted;

    const newSets = sets.map(s => {
      // If we are marking as done, only mark if fields are filled
      if (targetState) {
        if (s.weight && s.reps) {
          return { ...s, completed: true };
        }
        return s;
      }
      // If marking as not done, just uncheck
      return { ...s, completed: false };
    });

    setSets(newSets);
    updateParent(newSets);
    saveSets(newSets, true); // immediate = true
  };

  const removeSet = (index) => {
    const newSets = sets.filter((_, i) => i !== index);
    setSets(newSets);
    updateParent(newSets);
    saveSets(newSets, true); // immediate = true
  };

  const allSetsCompleted = sets.length > 0 && sets.every(s => s.completed);

  // Calculate the single best set in the current session to avoid duplicate PRs
  const bestSetIndex = useMemo(() => {
    let bestIdx = -1;
    let best = { weight: 0, reps: 0 };

    sets.forEach((set, idx) => {
      if (!set.completed) return;
      const w = parseFloat(set.weight) || 0;
      const r = parseFloat(set.reps) || 0;

      if (w > best.weight) {
        best = { weight: w, reps: r };
        bestIdx = idx;
      } else if (w === best.weight && r > best.reps) {
        best = { weight: w, reps: r };
        bestIdx = idx;
      }
    });
    return bestIdx;
  }, [sets]);

  // Trigger confetti when a new PR is achieved
  useEffect(() => {
    // If we have a valid best set index
    if (bestSetIndex !== -1) {
      // Check if it's different from the last one (or if it's the first time we're checking and it's a PR)
      // We also check if the current best set IS actually a new record
      const currentSet = sets[bestSetIndex];
      const isRecord = isNewRecord(currentSet.weight, currentSet.reps);

      if (isRecord && bestSetIndex !== prevBestSetIndexRef.current) {
        // Check if we've already shown confetti for this specific PR instance
        // This prevents re-triggering on page reload or re-render
        const prKey = `snapcal_pr_shown_${log.id}_${bestSetIndex}`;
        if (localStorage.getItem(prKey)) {
          prevBestSetIndexRef.current = bestSetIndex;
          return;
        }

        // Mark as shown
        localStorage.setItem(prKey, 'true');

        // Get the trophy element position
        const trophyEl = trophyRefs.current[bestSetIndex];
        let origin = { x: 0.5, y: 0.5 };

        if (trophyEl) {
          const rect = trophyEl.getBoundingClientRect();
          origin = {
            x: (rect.left + rect.width / 2) / window.innerWidth,
            y: (rect.top + rect.height / 2) / window.innerHeight
          };
        }

        // Fire miniature confetti around the trophy
        confetti({
          particleCount: 30,
          spread: 40,
          startVelocity: 20,
          origin: origin,
          colors: ['#FFD700', '#FFA500', '#FFEC8B'], // Gold shades
          disableForReducedMotion: true,
          scalar: 0.6, // Smaller particles
          ticks: 60 // Shorter duration
        });
      }
    }
    prevBestSetIndexRef.current = bestSetIndex;
  }, [bestSetIndex, sets]); // Depend on sets to access the data

  return (
  <div className={`bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-100 transition-all ${isTemp ? 'opacity-60 pointer-events-none' : ''}`}>
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
          {(log.exercise_name || log.exercise || '?').charAt(0)}
        </div>
        <div>
          <h3 className="font-bold text-slate-800">{log.exercise_name || log.exercise}</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{log.category}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setShowCalculator(true)}
          className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
          title="Plate Calculator"
        >
          <Calculator className="w-4 h-4" />
        </button>
        <button
          onClick={quickFinish}
          className={`p-2 rounded-full transition-colors ${allSetsCompleted
            ? 'text-green-600 bg-green-50 hover:bg-green-100'
            : 'text-slate-300 hover:text-green-600 hover:bg-green-50'
            }`}
          title={allSetsCompleted ? "Mark all as incomplete" : "Mark all as done"}
        >
          <CheckCircle className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(log.id)}
          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>

    {/* Inline Sets Editor */}
    <div className="space-y-3">
      <div className="grid grid-cols-10 gap-2 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
        <div className="col-span-1">Set</div>
        <div className="col-span-3">Lbs</div>
        <div className="col-span-3">Reps</div>
        <div className="col-span-2">Done</div>
        <div className="col-span-1"></div>
      </div>

      {sets.map((set, idx) => {
        // Only mark as PR if it's the best set in the current session AND beats history
        const isPR = set.completed && idx === bestSetIndex && isNewRecord(set.weight, set.reps);

        return (
          <div
            key={idx}
            className={`grid grid-cols-10 gap-2 items-center transition-all ${set.completed ? (isPR ? 'opacity-100' : 'opacity-50') : 'opacity-100'}`}
          >
            <div className="col-span-1 flex justify-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isPR ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                {idx + 1}
              </div>
            </div>
            <div className="col-span-3">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={set.weight}
                onChange={e => updateSet(idx, 'weight', e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                disabled={set.completed}
                placeholder="-"
                className={`w-full text-center py-2 border rounded-lg outline-none font-bold text-base sm:text-sm disabled:bg-slate-100 transition-all ${isPR
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                  }`}
              />
            </div>
            <div className="col-span-3">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={set.reps}
                onChange={e => updateSet(idx, 'reps', e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                disabled={set.completed}
                placeholder="-"
                className={`w-full text-center py-2 border rounded-lg outline-none font-bold text-base sm:text-sm disabled:bg-slate-100 transition-all ${isPR
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                  }`}
              />
            </div>
            <div className="col-span-2 flex justify-center">
              <button
                onClick={() => toggleSetCompletion(idx)}
                className={`p-1.5 rounded-lg transition-all shadow-sm ${set.completed
                  ? 'bg-green-500 text-white ring-2 ring-green-200'
                  : (!set.weight || !set.reps)
                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                    : 'bg-slate-200 text-slate-400 hover:bg-slate-300'
                  }`}
              >
                {set.completed ? <Check className="w-5 h-5" /> : <Check className="w-5 h-5 opacity-0" />}
              </button>
            </div>
            <div
              className="col-span-1 flex justify-center"
              ref={el => trophyRefs.current[idx] = el}
            >
              {!set.completed ? (
                <button
                  onClick={() => removeSet(idx)}
                  className="text-slate-300 hover:text-red-500 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : isPR && (
                <div className="animate-in zoom-in duration-500 text-amber-500 drop-shadow-sm">
                  <Trophy className="w-5 h-5 fill-amber-100" />
                </div>
              )}
            </div>
          </div>
        );
      })}

      <button
        onClick={addSet}
        className="w-full py-3 mt-2 border border-dashed border-indigo-200 rounded-xl text-indigo-500 font-bold text-sm hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Set
      </button>
    </div>
    <PlateCalculator
      isOpen={showCalculator}
      onClose={() => setShowCalculator(false)}
      onApply={handleApplyWeight}
    />    </div>
);
}
