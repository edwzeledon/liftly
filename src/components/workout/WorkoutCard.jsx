import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { CheckCircle, Trash2, Check, X, Plus, Trophy, Calculator } from 'lucide-react';
import confetti from 'canvas-confetti';
import PlateCalculator from './PlateCalculator';
import { toDisplay, toLb, formatWeight } from '@/lib/units';
import { restProgress } from '@/lib/restTimer';

// Controlled lb-state input that edits in the user's display unit. While
// focused, the raw draft string is shown so typing "102.5" isn't fought by
// round-trip rounding; state (and storage) stay canonical lb.
function WeightInput({ valueLb, unit, onCommit, onFocus, onBlur, className }) {
  const [draft, setDraft] = useState(null);
  const settled = valueLb === '' || valueLb == null ? '' : String(toDisplay(valueLb, unit));
  return (
    <input
      type="number"
      inputMode="decimal"
      min="0"
      placeholder="-"
      value={draft !== null ? draft : settled}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        onCommit(raw === '' ? '' : String(toLb(raw, unit)));
      }}
      onFocus={(e) => { setDraft(settled); if (onFocus) onFocus(e); }}
      onBlur={(e) => { setDraft(null); if (onBlur) onBlur(e); }}
      className={className}
    />
  );
}

// "Ready" charging ring: the NEXT set's Done control fills clockwise as
// recovery accumulates (restProgress). Owns its own 1s tick (SessionTimer
// pattern) so rows don't re-render per second. Discrete steps — no CSS
// transition on the arc, so it's reduced-motion safe by construction.
// Long-press (500ms) reveals remaining m:ss; that release never completes
// the set. Tapping early always works — the ring is advice, not a gate.
function RestingDone({ startedAt, bandSec, disabled, onTap, ariaLabel }) {
  const [, force] = useState(0);
  const [holding, setHolding] = useState(false);
  const longPressRef = useRef({ timer: null, fired: false });
  // eslint-disable-next-line react-hooks/purity -- live clock display, interval-driven like SessionTimer
  const { fraction, ready, remainingSec } = restProgress(startedAt, bandSec, Date.now());

  useEffect(() => {
    if (ready && !holding) return undefined;
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [ready, holding]);

  const beginHold = () => {
    longPressRef.current.timer = setTimeout(() => {
      longPressRef.current.fired = true;
      setHolding(true);
    }, 500);
  };
  const endHold = () => {
    clearTimeout(longPressRef.current.timer);
    setHolding(false);
    // Reset AFTER the gesture's own click (if any) has been dispatched —
    // a drag-off release produces no click and must not eat the next tap.
    setTimeout(() => { longPressRef.current.fired = false; }, 0);
  };

  const C = 2 * Math.PI * 21;
  const label = holding
    ? `${Math.floor(remainingSec / 60)}:${String(remainingSec % 60).padStart(2, '0')}`
    : ready ? 'Ready' : 'Rest';

  return (
    <div className="relative">
      <button
        onClick={() => {
          if (longPressRef.current.fired) { longPressRef.current.fired = false; return; }
          onTap();
        }}
        onPointerDown={beginHold}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        disabled={disabled}
        aria-label={`${ready ? 'Rest complete' : 'Resting'} — ${ariaLabel}`}
        aria-pressed={false}
        className={`relative w-12 h-12 rounded-full transition-colors flex items-center justify-center ${ready
          ? 'bg-training-soft text-training-text'
          : disabled ? 'bg-muted text-faint cursor-not-allowed opacity-40' : 'bg-input text-muted-foreground'
        }`}
      >
        <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90" aria-hidden="true">
          <circle cx="24" cy="24" r="21" fill="none" strokeWidth="3" stroke="var(--color-muted)" />
          <circle cx="24" cy="24" r="21" fill="none" strokeWidth="3" strokeLinecap="round"
            stroke="var(--color-training-text)" strokeDasharray={C} strokeDashoffset={C * (1 - fraction)} />
        </svg>
        <Check className={`w-6 h-6 ${ready ? '' : 'opacity-40'}`} />
      </button>
      <span aria-hidden="true" className={`absolute -bottom-4 inset-x-0 text-center text-[9px] font-bold uppercase tracking-wider pointer-events-none tabular-nums ${ready ? 'text-training-text' : 'text-faint'}`}>
        {label}
      </span>
    </div>
  );
}

export default function WorkoutCard({ log, onDelete, onUpdate, weightUnit = 'lb', activeRest = null, onRestStart, onRestClear, onRestRetarget, lastRef = null }) {
  const [sets, setSets] = useState(log.sets || []);
  const [bestSet, setBestSet] = useState(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const isTemp = String(log.id).startsWith('temp');
  const abortControllerRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const prevBestSetIndexRef = useRef(-1);
  const setsOnFocusRef = useRef(null);
  const trophyRefs = useRef({});
  const pendingEditsRef = useRef(null);
  const userEditedSetsRef = useRef(new Set());

  // Sync state with props if props change (e.g. initial load)
  useEffect(() => {
    setSets(log.sets || []);
  }, [log.sets]);


  const performSave = useCallback(async (newSets) => {
    // If temp ID, queue the changes instead of making API call
    if (isTemp) {
      pendingEditsRef.current = { sets: newSets };
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`/api/workouts/logs/${log.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sets: newSets }),
        signal: controller.signal
      });
      if (!response.ok) throw new Error('Failed to save sets');
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error("Error saving sets:", e);
      }
    }
  }, [log.id, isTemp]);

  // Flush pending edits when temp ID becomes real ID
  useEffect(() => {
    if (!isTemp && pendingEditsRef.current) {
      const editsToFlush = pendingEditsRef.current;
      pendingEditsRef.current = null;
      
      // Apply the queued edits
      performSave(editsToFlush.sets);
    }
  }, [isTemp, performSave]);

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
    const lbStr = String(toLb(weight, weightUnit));
    if (sets.length > 0) {
      // Apply only to sets that are NOT completed
      const newSets = sets.map(set => (
        set.completed ? set : { ...set, weight: lbStr }
      ));
      setSets(newSets);
      updateParent(newSets);
      saveSets(newSets); // debounced
    } else {
      // If no sets, create one
      const newSets = [{ weight: lbStr, reps: '', completed: false }];
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

  const updateParent = (newSets, editedSets = null) => {
    if (onUpdate) {
      const updateData = { ...log, sets: newSets };
      if (editedSets !== null) {
        updateData.__userEditedSets = editedSets;
      }
      onUpdate(updateData);
    }
  };


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

    if (activeRest && activeRest.nextIdx === null && onRestRetarget) onRestRetarget(log.id, newSets.length - 1);
  };

  const updateSet = (index, field, value) => {
    // Sanitize input to allow only numbers and one decimal point
    if (value && !/^\d*\.?\d*$/.test(value)) return;

    const newSets = [...sets];
    newSets[index][field] = value;

    // Invariant: completed ⇒ weight and reps non-empty; clearing either field un-completes the set.
    if (newSets[index].completed && (!newSets[index].weight || !newSets[index].reps)) {
      newSets[index].completed = false;
      if (onRestClear) onRestClear(log.id, index);
    }

    setSets(newSets);

    // Track that this set has been edited by the user
    userEditedSetsRef.current.add(index);
    
    // Pass edit info to parent
    const editedSetsArray = Array.from(userEditedSetsRef.current);
    updateParent(newSets, editedSetsArray);
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

    if (newSets[index].completed) {
      const nextIdx = newSets.findIndex((s, i) => i > index && !s.completed);
      if (onRestStart) onRestStart(log.id, index, nextIdx === -1 ? null : nextIdx, log.category);
    } else if (onRestClear) {
      onRestClear(log.id, index);
    }
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

    if (targetState) {
      if (onRestStart && newSets.some((s) => s.completed)) onRestStart(log.id, newSets.length - 1, null, log.category);
    } else if (onRestClear) {
      onRestClear(log.id, null);
    }
  };

  const removeSet = (index) => {
    const newSets = sets.filter((_, i) => i !== index);
    setSets(newSets);
    updateParent(newSets);
    saveSets(newSets, true); // immediate = true

    if (onRestClear) onRestClear(log.id, null);
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
  <div className={`bg-card p-5 rounded-2xl border border-border hover:border-training-soft-border transition-all ${isTemp ? 'opacity-60' : ''}`}>
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-training-soft flex items-center justify-center text-training-text font-bold">
          {(log.exercise_name || log.exercise || '?').charAt(0)}
        </div>
        <div>
          <h3 className="font-bold text-foreground">{log.exercise_name || log.exercise}</h3>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0">{log.category}</span>
            {(lastRef || bestSet) && (
              <span className="text-xs text-muted-foreground tabular-nums truncate">
                {lastRef && <>Last: {formatWeight(lastRef.weight, weightUnit)} × {lastRef.reps}</>}
                {lastRef && bestSet && ' · '}
                {bestSet && <>Best: {formatWeight(parseFloat(bestSet.weight) || 0, weightUnit)} × {bestSet.reps}</>}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setShowCalculator(true)}
          aria-label="Plate calculator"
          className="p-2 text-faint hover:text-training-text hover:bg-training-soft rounded-full transition-colors min-h-11 min-w-11 flex items-center justify-center"
          title="Plate Calculator"
        >
          <Calculator className="w-4 h-4" />
        </button>
        <button
          onClick={quickFinish}
          aria-label={allSetsCompleted ? "Mark all sets incomplete" : "Quick finish"}
          className={`p-2 rounded-full transition-colors min-h-11 min-w-11 flex items-center justify-center ${allSetsCompleted
            ? 'text-protein-text bg-protein-soft hover:bg-protein-soft/80'
            : 'text-faint hover:text-protein-text hover:bg-protein-soft'
            }`}
          title={allSetsCompleted ? "Mark all as incomplete" : "Mark all as done"}
        >
          <CheckCircle className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(log.id)}
          aria-label="Delete exercise"
          className="p-2 text-faint hover:text-destructive-text hover:bg-destructive/10 rounded-full transition-colors min-h-11 min-w-11 flex items-center justify-center"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>

    {/* Inline Sets Editor */}
    <div className="space-y-4">
      <div className="grid grid-cols-10 gap-2 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">
        <div className="col-span-1">Set</div>
        <div className="col-span-3">{weightUnit === 'kg' ? 'Kg' : 'Lb'}</div>
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
            className={`grid grid-cols-10 gap-2 items-center transition-all ${set.completed && !isPR ? 'bg-protein-soft rounded-lg' : ''}`}
          >
            <div className="col-span-1 flex justify-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isPR ? 'bg-streak-soft text-streak' : 'bg-muted text-muted-foreground'}`}>
                {idx + 1}
              </div>
            </div>
            <div className="col-span-3">
              <WeightInput
                valueLb={set.weight}
                unit={weightUnit}
                onCommit={(lbStr) => updateSet(idx, 'weight', lbStr)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                className={`w-full text-center min-h-14 py-2 border rounded-lg outline-none font-bold text-lg transition-all ${isPR
                  ? 'bg-streak-soft border-streak-soft-border focus:border-streak'
                  : set.completed
                    ? 'bg-protein-soft border-protein-soft text-protein-text focus:border-protein-text'
                    : 'bg-muted border-border text-foreground focus:border-ring focus:ring-2 focus:ring-ring'
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
                placeholder="-"
                className={`w-full text-center min-h-14 py-2 border rounded-lg outline-none font-bold text-lg transition-all ${isPR
                  ? 'bg-streak-soft border-streak-soft-border focus:border-streak'
                  : set.completed
                    ? 'bg-protein-soft border-protein-soft text-protein-text focus:border-protein-text'
                    : 'bg-muted border-border text-foreground focus:border-ring focus:ring-2 focus:ring-ring'
                  }`}
              />
            </div>
            <div className="col-span-2 flex justify-center">
              {activeRest && activeRest.nextIdx === idx && !set.completed ? (
                <RestingDone
                  startedAt={activeRest.startedAt}
                  bandSec={activeRest.bandSec}
                  disabled={!set.weight || !set.reps}
                  onTap={() => toggleSetCompletion(idx)}
                  ariaLabel={`Mark set ${idx + 1} done`}
                />
              ) : (
                <button
                  onClick={() => toggleSetCompletion(idx)}
                  disabled={!set.weight || !set.reps}
                  aria-label={`Mark set ${idx + 1} ${set.completed ? 'not done' : 'done'}`}
                  aria-pressed={set.completed}
                  className={`w-12 h-12 rounded-full transition-all flex items-center justify-center ${set.completed
                    ? 'bg-protein-soft text-protein ring-2 ring-protein/30'
                    : (!set.weight || !set.reps)
                      ? 'bg-muted text-faint cursor-not-allowed opacity-40'
                      : 'bg-input text-muted-foreground hover:bg-input/80'
                    }`}
                >
                  <Check className={`w-6 h-6 ${set.completed ? '' : 'opacity-0'}`} />
                </button>
              )}
            </div>
            <div
              className="col-span-1 flex justify-center"
              ref={el => trophyRefs.current[idx] = el}
            >
              {!set.completed ? (
                <button
                  onClick={() => removeSet(idx)}
                  aria-label={`Remove set ${idx + 1}`}
                  className="relative text-faint hover:text-destructive-text p-1 flex items-center justify-center before:absolute before:-inset-2.5 before:content-['']"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : isPR && (
                <div className="animate-in zoom-in duration-500 text-streak">
                  <Trophy className="w-5 h-5 fill-streak/20" />
                </div>
              )}
            </div>
          </div>
        );
      })}

      <button
        onClick={addSet}
        className={`w-full py-3 mt-2 border border-dashed border-training-soft-border rounded-xl text-training-text font-bold text-sm hover:bg-training-soft transition-all flex items-center justify-center gap-2 ${activeRest && activeRest.nextIdx === null ? 'ring-2 ring-training-text/40' : ''}`}
      >
        <Plus className="w-4 h-4" />
        Add Set
      </button>
    </div>
    <PlateCalculator
      key={showCalculator ? 'open' : 'closed'}
      isOpen={showCalculator}
      onClose={() => setShowCalculator(false)}
      onApply={handleApplyWeight}
      unit={weightUnit}
    /> </div>
);
}
