import React, { useState, useEffect } from 'react';
import { Flame, Sparkles, Brain } from 'lucide-react';

const DualRing = ({ protein, proteinGoal, calories, calorieGoal, baseCalorieGoal, onEditProtein, onEditCalories }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const outer = { r: 42, w: 9 };  // protein
  const inner = { r: 31, w: 5 };  // calories
  const ring = (r) => 2 * Math.PI * r;
  const pct = (v, m) => Math.min(Math.max(v / (m || 1), 0), 1);
  const offset = (r, v, m) => ring(r) - (mounted ? pct(v, m) : 0) * ring(r);
  // ghost notch: marks the base (rest-day) goal position on the calorie ring
  const notchAngle = pct(baseCalorieGoal, calorieGoal) * 360 - 90;

  return (
    <div className="relative w-56 h-56 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={outer.r} fill="none" strokeWidth={outer.w} className="stroke-slate-100" stroke="currentColor" />
        <circle cx="50" cy="50" r={outer.r} fill="none" strokeWidth={outer.w} strokeLinecap="round"
          stroke="var(--color-protein)" strokeDasharray={ring(outer.r)} strokeDashoffset={offset(outer.r, protein, proteinGoal)}
          className="transition-all duration-700 ease-out motion-reduce:transition-none" />
        <circle cx="50" cy="50" r={inner.r} fill="none" strokeWidth={inner.w} className="stroke-slate-100" stroke="currentColor" />
        <circle cx="50" cy="50" r={inner.r} fill="none" strokeWidth={inner.w} strokeLinecap="round"
          stroke="#334155" strokeDasharray={ring(inner.r)} strokeDashoffset={offset(inner.r, calories, calorieGoal)}
          className="transition-all duration-700 ease-out motion-reduce:transition-none" />
        {baseCalorieGoal !== calorieGoal && (
          <line x1="50" y1={50 - inner.r - inner.w / 2} x2="50" y2={50 - inner.r + inner.w / 2}
            stroke="#cbd5e1" strokeWidth="1.5" transform={`rotate(${notchAngle + 90} 50 50)`} />
        )}
      </svg>
      <button onClick={onEditProtein}
        className="absolute inset-0 flex flex-col items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-emerald-400"
        aria-label={`Protein ${protein} of ${proteinGoal} grams. Edit goal.`}>
        <span className="font-display text-5xl font-black text-slate-800 tabular-nums leading-none">{protein}</span>
        <span className="text-sm font-semibold text-protein-strong tabular-nums">/ {proteinGoal} g protein</span>
        <span className="text-xs text-slate-400 tabular-nums mt-1">{calories} / {calorieGoal} kcal</span>
      </button>
    </div>
  );
};

const MacroBar = ({ label, value, max, barClass, onClick }) => (
  <button onClick={onClick} className="flex-1 text-left group" aria-label={`${label} ${value} of ${max} grams. Edit goal.`}>
    <div className="flex justify-between text-xs font-semibold mb-1">
      <span className="text-slate-500 group-hover:text-slate-700">{label}</span>
      <span className="text-slate-400 tabular-nums">{value} / {max} g</span>
    </div>
    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full ${barClass} transition-all duration-700 motion-reduce:transition-none`}
        style={{ width: `${Math.min(100, (value / (max || 1)) * 100)}%` }} />
    </div>
  </button>
);

export default function DailyProgress({ caloriesToday, dailyGoal, macroGoals, todaysLogs, onUpdateGoal, onSuggestMeal, onAnalyzeDay, suggestionCount = 0, overviewCount = 0, streak = 0, streakStatus = 'broken', trainingDay = false, calorieOffset = 0 }) {
  const remaining = dailyGoal - caloriesToday;
  const [editingGoal, setEditingGoal] = useState(null);
  const [tempGoalValue, setTempGoalValue] = useState('');

  const suggestionDisabled = suggestionCount >= 1;
  const overviewDisabled = overviewCount >= 1;

  // Calculate Macros
  const macros = todaysLogs.reduce((acc, log) => ({
    protein: acc.protein + (parseInt(log.protein) || 0),
    carbs: acc.carbs + (parseInt(log.carbs) || 0),
    fats: acc.fats + (parseInt(log.fats) || 0)
  }), { protein: 0, carbs: 0, fats: 0 });

  // Default goals if not provided
  const currentGoals = {
    calories: dailyGoal,
    protein: macroGoals?.protein || Math.round((dailyGoal * 0.3) / 4),
    carbs: macroGoals?.carbs || Math.round((dailyGoal * 0.4) / 4),
    fats: macroGoals?.fats || Math.round((dailyGoal * 0.3) / 9)
  };

  const effectiveCalorieGoal = currentGoals.calories + (trainingDay ? calorieOffset : 0);

  const handleStartEdit = (type, value) => {
    setEditingGoal(type);
    setTempGoalValue(value.toString());
  };

  // Lock body scroll when editing
  useEffect(() => {
    if (editingGoal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [editingGoal]);

  const handleSaveGoal = () => {
    if (editingGoal === 'calories') {
      onUpdateGoal({ dailyGoal: parseInt(tempGoalValue) });
    } else {
      onUpdateGoal({ [`${editingGoal}Goal`]: parseInt(tempGoalValue) });
    }
    setEditingGoal(null);
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
      <div className="relative z-10 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-800">Daily Progress</h2>
            <p className="text-slate-500 text-sm">Fuel your training</p>
            {streakStatus === 'at_risk' && streak > 0 && (
              <p className="text-xs font-medium text-rose-500 mt-1">
                Log food or train today to keep your {streak} day streak!
              </p>
            )}
          </div>
          {streak > 0 && (
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border animate-in fade-in slide-in-from-right-4 ${
              streakStatus === 'safe' 
                ? 'bg-orange-50 border-orange-100' 
                : 'bg-slate-50 border-slate-100'
            }`}>
              <Flame className={`w-5 h-5 ${
                streakStatus === 'safe' ? 'text-orange-500 fill-orange-500' : 'text-slate-300 fill-slate-300'
              }`} />
              <span className={`font-bold text-lg ${
                streakStatus === 'safe' ? 'text-orange-600' : 'text-slate-400'
              }`}>{streak}</span>
            </div>
          )}
        </div>

        <DualRing
          protein={macros.protein} proteinGoal={currentGoals.protein}
          calories={caloriesToday} calorieGoal={effectiveCalorieGoal} baseCalorieGoal={currentGoals.calories}
          onEditProtein={() => handleStartEdit('protein', currentGoals.protein)}
          onEditCalories={() => handleStartEdit('calories', currentGoals.calories)}
        />
        <div className="flex gap-6 mt-6">
          <MacroBar label="Carbs" value={macros.carbs} max={currentGoals.carbs} barClass="bg-amber-500"
            onClick={() => handleStartEdit('carbs', currentGoals.carbs)} />
          <MacroBar label="Fats" value={macros.fats} max={currentGoals.fats} barClass="bg-rose-500"
            onClick={() => handleStartEdit('fats', currentGoals.fats)} />
        </div>
        <div className="mt-3">
          <button onClick={() => handleStartEdit('calories', currentGoals.calories)}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600">
            Edit calorie goal
          </button>
        </div>
      </div>

      {/* Edit Goal Overlay */}
      {editingGoal && (
        <div className="fixed inset-0 z-100 bg-white/95 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="w-full max-w-sm">
                <h3 className="text-xl font-bold text-slate-800 mb-2 text-center capitalize">Update {editingGoal} Goal</h3>
                <p className="text-slate-400 text-sm text-center mb-6">Enter your new daily target</p>
                
                <div className="flex gap-3">
                    <input 
                        type="number" 
                        value={tempGoalValue}
                        onChange={e => setTempGoalValue(e.target.value)}
                        className="flex-1 px-4 py-3 rounded-2xl border-2 border-indigo-100 text-2xl font-bold text-center text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all"
                        autoFocus
                        placeholder="0"
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveGoal()}
                    />
                </div>
                <div className="flex gap-3 mt-4">
                    <button onClick={() => setEditingGoal(null)} className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSaveGoal} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
                        Save
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* AI Suggestion Buttons */}
      <div className="mt-2 pt-4 border-t border-slate-50 flex gap-3">
        <button 
          onClick={onSuggestMeal}
          disabled={suggestionDisabled}
          className={`flex-1 flex items-center justify-center gap-2 text-sm font-semibold transition-colors px-4 py-2 rounded-xl active:scale-95 ${
            suggestionDisabled 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          {remaining > 0 ? "Chef's Suggestion" : "Diet Rescue"} {suggestionDisabled ? "(0/1)" : "(1/1)"}
        </button>
        <button 
          onClick={onAnalyzeDay}
          disabled={overviewDisabled}
          className={`flex-1 flex items-center justify-center gap-2 text-sm font-semibold transition-colors px-4 py-2 rounded-xl active:scale-95 ${
            overviewDisabled 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100'
          }`}
        >
          <Brain className="w-4 h-4" />
          Daily Overview {overviewDisabled ? "(0/1)" : "(1/1)"}
        </button>
      </div>
    </div>
  );
}
