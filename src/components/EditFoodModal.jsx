'use client';

import React, { useState } from 'react';
import { X, Edit2, Loader2, Save } from 'lucide-react';
import { updateLog } from '@/lib/api';

export default function EditFoodModal({ log, onClose, onUpdate }) {
  const [form, setForm] = useState({
    foodItem: log.food_item,
    calories: log.calories,
    protein: log.protein || 0,
    carbs: log.carbs || 0,
    fats: log.fats || 0
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onUpdate(log.id, form);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-sm rounded-2xl p-6 relative animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-muted rounded-full text-muted-foreground hover:bg-muted/80 transition-colors">
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Edit2 className="w-5 h-5 text-training-text" />
          Edit Meal
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Food Name</label>
            <input
              type="text"
              value={form.foodItem}
              onChange={e => setForm({...form, foodItem: e.target.value})}
              className="w-full px-4 py-2 bg-muted border border-border rounded-xl focus:border-ring focus:ring-2 focus:ring-ring outline-none transition-all font-medium text-foreground"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Calories</label>
            <input
              type="number"
              value={form.calories}
              onChange={e => setForm({...form, calories: e.target.value})}
              className="w-full px-4 py-2 bg-muted border border-border rounded-xl focus:border-ring focus:ring-2 focus:ring-ring outline-none transition-all font-bold text-training-text"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
             <div>
              <label className="block text-[10px] font-bold text-faint mb-1 uppercase">Protein</label>
              <input
                type="number"
                value={form.protein}
                onChange={e => setForm({...form, protein: e.target.value})}
                className="w-full px-3 py-2 bg-muted rounded-xl border border-border focus:border-deficit outline-none text-sm text-center"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-faint mb-1 uppercase">Carbs</label>
              <input
                type="number"
                value={form.carbs}
                onChange={e => setForm({...form, carbs: e.target.value})}
                className="w-full px-3 py-2 bg-muted rounded-xl border border-border focus:border-carb outline-none text-sm text-center"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-faint mb-1 uppercase">Fats</label>
              <input
                type="number"
                value={form.fats}
                onChange={e => setForm({...form, fats: e.target.value})}
                className="w-full px-3 py-2 bg-muted rounded-xl border border-border focus:border-fat outline-none text-sm text-center"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
