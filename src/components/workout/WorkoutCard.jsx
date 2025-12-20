import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, Trash2, Check, X, Plus, Trophy } from 'lucide-react';

export default function WorkoutCard({ log, onDelete, onUpdate }) {
  const [sets, setSets] = useState(log.sets || []);
  const [bestSet, setBestSet] = useState(null);
  const isTemp = String(log.id).startsWith('temp');
  const abortControllerRef = useRef(null);

  // Sync state with props if props change (e.g. initial load)
  useEffect(() => {
    setSets(log.sets || []);
  }, [log.sets]);

  // Fetch Personal Record (Best Set)
  useEffect(() => {
    const fetchBestSet = async () => {
      const exerciseName = log.exercise_name || log.exercise;
      if (!exerciseName) return;

      // 1. Try Local Cache First
      const cacheKey = `snapcal_pr_${exerciseName}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          setBestSet(JSON.parse(cached));
        } catch (e) {
          console.error("Error parsing cached PR", e);
        }
      }

      // 2. Fetch from API (Background Update)
      try {
        const res = await fetch(`/api/workouts/history/best?exercise=${encodeURIComponent(exerciseName)}`);
        if (res.ok) {
          const data = await res.json();
          
          // Only update if data changed to avoid unnecessary re-renders
          if (JSON.stringify(data) !== cached) {
            setBestSet(data);
            if (data) {
              localStorage.setItem(cacheKey, JSON.stringify(data));
            } else {
              localStorage.removeItem(cacheKey);
            }
          }
        }
      } catch (e) {
        console.error("Error fetching PR", e);
      }
    };
    fetchBestSet();
  }, [log.exercise_name, log.exercise]);

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

  const saveSets = useCallback(async (newSets) => {
    // Cancel any pending save
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
  }, [log.id]);

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
    saveSets(newSets);
  };

  const updateSet = (index, field, value) => {
    // Sanitize input to allow only numbers and one decimal point
    if (value && !/^\d*\.?\d*$/.test(value)) return;

    const newSets = [...sets];
    newSets[index][field] = value;
    setSets(newSets);
  };

  const handleBlur = () => {
    updateParent(sets);
    saveSets(sets);
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
    saveSets(newSets);
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
    saveSets(newSets);
  };

  const removeSet = (index) => {
    const newSets = sets.filter((_, i) => i !== index);
    setSets(newSets);
    updateParent(newSets);
    saveSets(newSets);
  };

  const allSetsCompleted = sets.length > 0 && sets.every(s => s.completed);

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
              {bestSet && (
                <span className="text-[10px] font-medium text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  PR: {bestSet.weight}lb x {bestSet.reps}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
             onClick={quickFinish}
             className={`p-2 rounded-full transition-colors ${
               allSetsCompleted 
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
          const isPR = set.completed && isNewRecord(set.weight, set.reps);
          
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
                  onBlur={handleBlur}
                  disabled={set.completed}
                  placeholder="-"
                  className={`w-full text-center py-2 border rounded-lg outline-none font-bold text-sm disabled:bg-slate-100 transition-all ${
                    isPR 
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
                  onBlur={handleBlur}
                  disabled={set.completed}
                  placeholder="-"
                  className={`w-full text-center py-2 border rounded-lg outline-none font-bold text-sm disabled:bg-slate-100 transition-all ${
                    isPR 
                      ? 'bg-amber-50 border-amber-200' 
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                  }`}
                />
              </div>
              <div className="col-span-2 flex justify-center">
                <button 
                  onClick={() => toggleSetCompletion(idx)}
                  className={`p-1.5 rounded-lg transition-all shadow-sm ${
                    isPR
                      ? 'bg-amber-500 text-white ring-2 ring-amber-200 shadow-amber-200'
                      : set.completed 
                        ? 'bg-green-500 text-white ring-2 ring-green-200' 
                        : (!set.weight || !set.reps) 
                          ? 'bg-slate-100 text-slate-300 cursor-not-allowed' 
                          : 'bg-slate-200 text-slate-400 hover:bg-slate-300'
                  }`}
                >
                  {isPR ? <Trophy className="w-5 h-5" /> : (set.completed ? <Check className="w-5 h-5" /> : <Check className="w-5 h-5 opacity-0" />)}
                </button>
              </div>
             <div className="col-span-1 flex justify-center">
               {!set.completed && (
                  <button 
                    onClick={() => removeSet(idx)}
                    className="text-slate-300 hover:text-red-500 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
               )}
            </div>
          </div>
        ); })}

        <button 
          onClick={addSet}
          className="w-full py-3 mt-2 border border-dashed border-indigo-200 rounded-xl text-indigo-500 font-bold text-sm hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Set
        </button>
      </div>
    </div>
  );
}
