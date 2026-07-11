'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Beef, Plus, Minus, Check, X } from 'lucide-react';
import { addLog, deleteLog } from '@/lib/api';

const DEFAULT_PRESETS = [
  { id: 'chicken', name: 'Chicken breast', protein: 31, calories: 165 },
  { id: 'shake', name: 'Protein shake', protein: 25, calories: 130 },
  { id: 'eggs', name: '3 Eggs', protein: 19, calories: 215 },
  { id: 'yogurt', name: 'Greek yogurt', protein: 17, calories: 100 },
  { id: 'tuna', name: 'Tuna can', protein: 25, calories: 120 },
];

export default function QuickProtein({ user, onLogAdded }) {
  const [presets, setPresets] = useState(DEFAULT_PRESETS);
  const [activeId, setActiveId] = useState(null); // chip expanded with stepper
  const [portions, setPortions] = useState(1);
  const [toast, setToast] = useState(null); // { logId, name }
  const toastTimer = useRef(null);

  // Step 1b: preset editing
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newProtein, setNewProtein] = useState('');
  const [newCalories, setNewCalories] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('snapcal_protein_presets');
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating client-only localStorage after mount; a lazy useState initializer would mismatch the SSR-rendered defaults.
      if (saved) setPresets(JSON.parse(saved));
    } catch { /* keep defaults */ }
  }, []);

  const savePresets = (next) => {
    setPresets(next);
    try { localStorage.setItem('snapcal_protein_presets', JSON.stringify(next)); } catch { /* ignore */ }
  };

  const removePreset = (p) => {
    savePresets(presets.filter((x) => x.id !== p.id));
  };

  const resetAddForm = () => {
    setAdding(false);
    setNewName('');
    setNewProtein('');
    setNewCalories('');
  };

  const addPreset = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    savePresets([
      ...presets,
      {
        id: crypto.randomUUID(),
        name: newName.trim(),
        protein: parseInt(newProtein) || 0,
        calories: parseInt(newCalories) || 0,
      },
    ]);
    resetAddForm();
  };

  const logPreset = async (preset) => {
    const qty = portions;
    setActiveId(null);
    setPortions(1);
    try {
      const created = await addLog(user.id, {
        foodItem: qty > 1 ? `${preset.name} ×${qty}` : preset.name,
        calories: preset.calories * qty,
        protein: preset.protein * qty,
        carbs: 0,
        fats: 0,
        mealType: 'snack',
        method: 'quick-protein',
      });
      if (onLogAdded) onLogAdded();
      clearTimeout(toastTimer.current);
      setToast({ logId: created?.id, name: preset.name });
      toastTimer.current = setTimeout(() => setToast(null), 5000);
    } catch (e) {
      console.error('Quick protein log failed', e);
      setToast({ error: true, name: preset.name });
      toastTimer.current = setTimeout(() => setToast(null), 5000);
    }
  };

  const undo = async () => {
    if (toast?.logId) {
      try {
        await deleteLog(toast.logId, user.id);
        if (onLogAdded) onLogAdded();
      } catch (e) { console.error('Undo failed', e); }
    }
    clearTimeout(toastTimer.current);
    setToast(null);
  };

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 relative">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Beef className="w-4 h-4 text-protein" />
          Quick Protein
        </h4>
        <button
          type="button"
          onClick={() => { setEditing((v) => !v); resetAddForm(); }}
          className="text-xs font-semibold text-slate-400 hover:text-slate-600 min-h-11 px-2 -mr-2"
        >
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          editing ? (
            <span
              key={p.id}
              className="flex items-center gap-2 rounded-full pl-3.5 pr-2 py-2 text-sm font-semibold border border-slate-200 bg-slate-50 text-slate-600 min-h-11"
            >
              <span>{p.name}</span>
              <span className="text-protein-strong tabular-nums">{p.protein}g</span>
              <button
                type="button"
                onClick={() => removePreset(p)}
                aria-label={`Remove ${p.name}`}
                className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ) : (
            <motion.button
              layout
              key={p.id}
              onClick={() => (activeId === p.id ? logPreset(p) : (setActiveId(p.id), setPortions(1)))}
              className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold border transition-colors active:scale-95 min-h-11 ${
                activeId === p.id
                  ? 'border-emerald-400 bg-emerald-50 text-slate-800'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{p.name}</span>
              <span className="text-protein-strong tabular-nums">{p.protein * (activeId === p.id ? portions : 1)}g</span>
              {activeId === p.id && (
                <span className="flex items-center gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
                  <span role="button" aria-label="Fewer portions" onClick={() => setPortions((n) => Math.max(1, n - 1))}
                    className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                    <Minus className="w-3 h-3" />
                  </span>
                  <span className="tabular-nums text-xs w-6 text-center">×{portions}</span>
                  <span role="button" aria-label="More portions" onClick={() => setPortions((n) => Math.min(9, n + 1))}
                    className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                    <Plus className="w-3 h-3" />
                  </span>
                  <span role="button" aria-label="Log it" onClick={() => logPreset(p)}
                    className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center ml-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                </span>
              )}
            </motion.button>
          )
        ))}

        {editing && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-semibold border border-dashed border-slate-300 text-slate-500 hover:bg-slate-50 min-h-11"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        )}
      </div>

      {editing && adding && (
        <form onSubmit={addPreset} className="mt-3 flex flex-wrap items-center gap-2 bg-slate-50 rounded-2xl p-3">
          <input
            type="text"
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 min-w-[7rem] text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 placeholder:text-slate-400 min-h-11"
            autoFocus
          />
          <input
            type="number"
            placeholder="Protein g"
            value={newProtein}
            onChange={(e) => setNewProtein(e.target.value)}
            className="w-24 text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 placeholder:text-slate-400 min-h-11 tabular-nums"
          />
          <input
            type="number"
            placeholder="Calories"
            value={newCalories}
            onChange={(e) => setNewCalories(e.target.value)}
            className="w-24 text-sm px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 placeholder:text-slate-400 min-h-11 tabular-nums"
          />
          <button
            type="submit"
            className="w-11 h-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center"
            aria-label="Save preset"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={resetAddForm}
            className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center"
            aria-label="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </form>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            role="status" aria-live="polite"
            className="absolute left-4 right-4 -bottom-3 translate-y-full sm:bottom-4 sm:translate-y-0 bg-slate-900 text-white text-sm rounded-xl px-4 py-3 flex items-center justify-between shadow-lg z-10"
          >
            <span>{toast.error ? `Couldn't save ${toast.name}` : `Logged ${toast.name}`}</span>
            {!toast.error && (
              <button onClick={undo} className="font-bold text-emerald-300 ml-3">Undo</button>
            )}
            <button onClick={() => setToast(null)} aria-label="Dismiss" className="ml-3 text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
