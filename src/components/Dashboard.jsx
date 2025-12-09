'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, Loader2, X } from 'lucide-react';
import { callGeminiText, deleteLog, getDailyStats, updateDailyStats, addLog } from '@/lib/api';
import DailyProgress from './dashboard/DailyProgress';
import WeeklyTrend from './dashboard/WeeklyTrend';
import HydrationTracker from './dashboard/HydrationTracker';
import MacroDistribution from './dashboard/MacroDistribution';
import MealFeed from './dashboard/MealFeed';
import QuickAdd from './dashboard/QuickAdd';
import WeightTrend from './dashboard/WeightTrend';

export default function Dashboard({ caloriesToday, dailyGoal, macroGoals, percentComplete, weeklyData, todaysLogs, user, onLogDeleted, onUpdateGoal, onEditLog, onLogAdded, onAddMeal, streak, streakStatus }) {
  const remaining = dailyGoal - caloriesToday;
  const [aiModal, setAiModal] = useState({ open: false, type: '', step: 'confirm', content: '', loading: false });
  
  // New State for Daily Stats
  const [dailyStats, setDailyStats] = useState({ water_intake: 0, scan_count: 0, overview_count: 0, suggestion_count: 0 }); 

  // Fetch Daily Stats on Load
  useEffect(() => {
    if (user) {
      loadDailyStats();
    }
  }, [user]);

  const loadDailyStats = async () => {
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const stats = await getDailyStats(dateStr);

      if (stats) {
        setDailyStats({
            water_intake: stats.water_intake || 0,
            scan_count: stats.scan_count || 0,
            overview_count: stats.overview_count || 0,
            suggestion_count: stats.suggestion_count || 0
        });
      }
    } catch (error) {
      console.error("Error loading daily stats:", error);
    }
  };

  const handleUpdateWater = async (newAmount) => {
    if (!user) return;
    // Ensure non-negative
    const safeAmount = Math.max(0, newAmount);
    setDailyStats(prev => ({ ...prev, water_intake: safeAmount }));
    
    try {
      await updateDailyStats({ 
        date: new Date().toISOString().split('T')[0], 
        water_intake: safeAmount 
      });
    } catch (error) {
      console.error("Error updating water:", error);
      // Revert on error - we might need a better way to revert if we don't track previous state explicitly here, 
      // but for now let's just re-fetch or keep it simple. 
      // Ideally we'd use optimistic UI with rollback.
      // For now, let's just log the error.
    }
  };



  const handleQuickAdd = async (logData) => {
    if (!user) return;
    try {
        await addLog(user.id, logData);
        // Only refetch if actually needed
        if (onLogAdded) onLogAdded();
    } catch (error) {
        console.error("Error adding quick log:", error);
    }
  };

  const handleDeleteLog = async (logId) => {
    if(!user) return;
    try {
      await deleteLog(logId, user.id);
      if (onLogDeleted) onLogDeleted();
    } catch (e) {
      console.error("Error deleting", e);
    }
  };

  const handleSuggestMeal = () => {
    setAiModal({
      open: true,
      type: 'suggestion',
      step: 'confirm',
      loading: false,
      content: "Need a healthy meal idea? Chef Gemini will analyze your remaining calories and suggest the perfect meal to hit your goals.\n\n(Limit: 1 per day)"
    });
  };

  const handleAnalyzeDay = () => {
    setAiModal({
      open: true,
      type: 'analysis',
      step: 'confirm',
      loading: false,
      content: "Get a personalized summary of your nutrition today with actionable tips to improve.\n\n(Limit: 1 per day)"
    });
  };

  const performAiAction = async () => {
    setAiModal(prev => ({ ...prev, loading: true }));
    
    try {
      let result = '';
      if (aiModal.type === 'suggestion') {
        result = await callGeminiText({
          type: 'suggestion',
          todaysLogs,
          dailyGoal,
          remaining
        });
        setDailyStats(prev => ({ ...prev, suggestion_count: (prev.suggestion_count || 0) + 1 }));
      } else {
        result = await callGeminiText({
          type: 'overview',
          todaysLogs,
          dailyGoal,
          caloriesToday
        });
        setDailyStats(prev => ({ ...prev, overview_count: (prev.overview_count || 0) + 1 }));
      }
      
      setAiModal(prev => ({ ...prev, content: result, loading: false, step: 'result' }));
    } catch (error) {
      setAiModal(prev => ({ 
        ...prev, 
        content: error.message || "Sorry, something went wrong.", 
        loading: false,
        step: 'result' // Show error in result view
      }));
    }
  };

  // Calculate Macros for Distribution Chart
  const currentMacros = todaysLogs.reduce((acc, log) => ({
    protein: acc.protein + (log.protein || 0),
    carbs: acc.carbs + (log.carbs || 0),
    fats: acc.fats + (log.fats || 0)
  }), { protein: 0, carbs: 0, fats: 0 });

  return (
    <div className="p-6 md:p-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
      
      {/* Row 1: Daily Progress & Quick Add/Hydration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <DailyProgress 
                caloriesToday={caloriesToday}
                dailyGoal={dailyGoal}
                macroGoals={macroGoals}
                todaysLogs={todaysLogs}
                onUpdateGoal={onUpdateGoal}
                onSuggestMeal={handleSuggestMeal}
                onAnalyzeDay={handleAnalyzeDay}
                suggestionCount={dailyStats.suggestion_count || 0}
                overviewCount={dailyStats.overview_count || 0}
                streak={streak}
                streakStatus={streakStatus}
            />
        </div>
        <div className="flex flex-col gap-6 h-full">
            <QuickAdd onAddLog={handleQuickAdd} />
            <div className="flex-1 min-h-0">
                <HydrationTracker 
                    waterIntake={dailyStats.water_intake} 
                    onUpdateWater={handleUpdateWater} 
                />
            </div>
        </div>
      </div>

      {/* Row 2: Weekly Trend vs Macros */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col">
            <WeeklyTrend weeklyData={weeklyData} />
        </div>
        <div className="h-full">
            <MacroDistribution 
                macros={currentMacros} 
                goals={macroGoals} 
            />
        </div>
      </div>

      {/* Row 3: Weight Trend */}
      <div className="w-full">
        <WeightTrend user={user} />
      </div>

      {/* Row 4: Meal Feed */}
      <div className="w-full">
        <MealFeed 
            logs={todaysLogs} 
            onEditLog={onEditLog} 
            onDeleteLog={handleDeleteLog}
            onAnalyzeDay={handleAnalyzeDay}
            onAddMeal={onAddMeal}
        />
      </div>

      {/* AI Modal */}
      {aiModal.open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none p-4 pb-24 sm:pb-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto transition-opacity" onClick={() => setAiModal({ ...aiModal, open: false })} />
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 pointer-events-auto transform transition-all animate-in slide-in-from-bottom-10 relative">
            <button 
              onClick={() => setAiModal({ ...aiModal, open: false })}
              className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex flex-col items-center text-center">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
                aiModal.type === 'suggestion' ? 'bg-indigo-100 text-indigo-600' : 'bg-purple-100 text-purple-600'
              }`}>
                {aiModal.loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : aiModal.type === 'suggestion' ? (
                  <Sparkles className="w-6 h-6" />
                ) : (
                  <Brain className="w-6 h-6" />
                )}
              </div>
              
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                {aiModal.loading ? 'Thinking...' : 
                 aiModal.step === 'confirm' ? (aiModal.type === 'suggestion' ? 'Chef Suggestion' : 'Daily Overview') :
                 (aiModal.type === 'suggestion' ? "Chef Gemini Suggests" : "Daily Insights")}
              </h3>
              
              <div className="text-slate-600 text-sm leading-relaxed w-full">
                {aiModal.loading ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-2 bg-slate-100 rounded w-3/4 mx-auto"></div>
                    <div className="h-2 bg-slate-100 rounded w-full"></div>
                    <div className="h-2 bg-slate-100 rounded w-5/6 mx-auto"></div>
                  </div>
                ) : (
                  <div className={`whitespace-pre-line ${aiModal.step === 'result' ? 'bg-slate-50 p-4 rounded-xl text-left border border-slate-100' : 'text-center px-2'}`}>
                    {aiModal.content}
                  </div>
                )}
              </div>

              {!aiModal.loading && (
                <div className="mt-6 w-full flex gap-3">
                  {aiModal.step === 'confirm' ? (
                    <>
                      <button 
                        onClick={() => setAiModal({ ...aiModal, open: false })}
                        className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 active:scale-95 transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={performAiAction}
                        className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200"
                      >
                        Generate
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => setAiModal({ ...aiModal, open: false })}
                      className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 active:scale-95 transition-all"
                    >
                      Got it
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
