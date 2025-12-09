import React, { useState, useEffect } from 'react';
import { Flame, Sparkles, Check, X, Beef, Wheat, Droplet, Brain } from 'lucide-react';

const CircleChart = ({ value, max, color, label, icon: Icon, onClick }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.min(Math.max(value / max, 0), 1);
  const offset = circumference - (percent * circumference);

  return (
    <div className="flex flex-col items-center gap-3 cursor-pointer group" onClick={onClick}>
      <div className="relative w-48 h-48 lg:w-40 lg:h-40 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="6"
            className="text-slate-100"
          />
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`${color} transition-all duration-1000 ease-out`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className={`w-6 h-6 mb-1 ${color.replace('text-', 'text-opacity-80 text-')}`} />
          <span className="text-2xl font-bold text-slate-700">{value}</span>
          <span className="text-xs text-slate-400 font-medium">/ {max}</span>
          <span className="text-[10px] text-slate-400 font-medium mt-1">
            {max - value > 0 ? `${max - value} left` : `${value - max} over`}
          </span>
        </div>
      </div>
      <span className="text-sm font-semibold text-slate-500 group-hover:text-indigo-600 transition-colors">{label}</span>
    </div>
  );
};

export default function DailyProgress({ caloriesToday, dailyGoal, macroGoals, todaysLogs, onUpdateGoal, onSuggestMeal, onAnalyzeDay, suggestionCount = 0, overviewCount = 0, streak = 0, streakStatus = 'broken' }) {
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
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-10 -mt-10 blur-2xl opacity-50"></div>
      
      <div className="relative z-10 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Daily Progress</h2>
            <p className="text-slate-500 text-sm">Tap any ring to edit your goal</p>
            {streakStatus === 'at_risk' && streak > 0 && (
              <p className="text-xs font-medium text-rose-500 mt-1 animate-pulse">
                🔥 Log a meal today to keep your {streak} day streak!
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 justify-items-center">
          <CircleChart 
            value={caloriesToday} 
            max={currentGoals.calories} 
            color="text-indigo-500" 
            label="Calories" 
            icon={Flame}
            onClick={() => handleStartEdit('calories', currentGoals.calories)}
          />
          <CircleChart 
            value={macros.protein} 
            max={currentGoals.protein} 
            color="text-blue-500" 
            label="Protein" 
            icon={Beef}
            onClick={() => handleStartEdit('protein', currentGoals.protein)}
          />
          <CircleChart 
            value={macros.carbs} 
            max={currentGoals.carbs} 
            color="text-amber-500" 
            label="Carbs" 
            icon={Wheat}
            onClick={() => handleStartEdit('carbs', currentGoals.carbs)}
          />
          <CircleChart 
            value={macros.fats} 
            max={currentGoals.fats} 
            color="text-rose-500" 
            label="Fats" 
            icon={Droplet}
            onClick={() => handleStartEdit('fats', currentGoals.fats)}
          />
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
