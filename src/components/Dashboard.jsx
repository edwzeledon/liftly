'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, Loader2 } from 'lucide-react';
import { callGeminiText, deleteLog, getDailyStats, updateDailyStats } from '@/lib/api';
import DailyProgress from './dashboard/DailyProgress';
import WeeklyTrend from './dashboard/WeeklyTrend';
import HydrationTracker from './dashboard/HydrationTracker';
import MealFeed from './dashboard/MealFeed';
import QuickProtein from './dashboard/QuickProtein';
import WeeklyReviewCard from './dashboard/WeeklyReviewCard';
import Sheet from './ui/Sheet';
import { useToast } from '@/hooks/useToast';

export default function Dashboard({ caloriesToday, dailyGoal, macroGoals, percentComplete, weeklyData, todaysLogs, user, onLogDeleted, onUpdateGoal, onEditLog, onLogAdded, onAddMeal, streak, streakStatus, trainingDay = false, calorieOffset = 0, trainingOffset = 250, offsetSkipped = false, onToggleBumpSkip }) {
  const effectiveGoal = dailyGoal + calorieOffset;
  const remaining = effectiveGoal - caloriesToday;
  const [aiModal, setAiModal] = useState({ open: false, type: '', step: 'confirm', content: '', loading: false });
  
  // New State for Daily Stats
  const [dailyStats, setDailyStats] = useState({ water_intake: 0, scan_count: 0, overview_count: 0, suggestion_count: 0 });

  // Optimistically-hidden meal rows: hidden immediately, the real deleteLog runs
  // on the toast's onCommit (undo unhides before commit fires).
  const [hiddenLogIds, setHiddenLogIds] = useState(new Set());
  const { toastEl, showToast } = useToast();

  const visibleTodaysLogs = todaysLogs.filter(log => !hiddenLogIds.has(log.id));

  const unhideLog = (logId) => {
    setHiddenLogIds(prev => {
      const next = new Set(prev);
      next.delete(logId);
      return next;
    });
  };

  // Fetch Daily Stats on Load
  useEffect(() => {
    if (user) {
      loadDailyStats();
    }
  }, [user]);

  const loadDailyStats = async () => {
    try {
      const dateStr = new Date().toLocaleDateString('en-CA');
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
    // Capture previous value BEFORE the optimistic set so we can roll back.
    const previousAmount = dailyStats.water_intake;
    setDailyStats(prev => ({ ...prev, water_intake: safeAmount }));

    try {
      await updateDailyStats({
        date: new Date().toLocaleDateString('en-CA'),
        water_intake: safeAmount
      });
    } catch (error) {
      console.error("Error updating water:", error);
      // Roll back the optimistic update — but only if the current value is still
      // the one THIS call set. If a newer tap already changed (and saved) it,
      // an out-of-order failure must not clobber that newer value.
      setDailyStats(prev => (
        prev.water_intake === safeAmount
          ? { ...prev, water_intake: previousAmount }
          : prev
      ));
      showToast({ message: "Couldn't save water", variant: 'error' });
    }
  };



  const handleDeleteLog = (logId) => {
    if(!user) return;
    // Optimistically hide the row; the REAL delete is the toast's onCommit.
    setHiddenLogIds(prev => new Set(prev).add(logId));
    showToast({
      message: 'Meal deleted',
      action: {
        label: 'Undo',
        onAction: () => unhideLog(logId),
      },
      onCommit: () => {
        deleteLog(logId, user.id)
          .then(async () => {
            if (onLogDeleted) await onLogDeleted();
            // Prune the id once the refetch has landed (the row is gone from
            // todaysLogs by now, so unhiding can't flash it back).
            unhideLog(logId);
          })
          .catch((e) => {
            console.error("Error deleting", e);
            // Commit failed: bring the row back and tell the user.
            unhideLog(logId);
            showToast({ message: "Couldn't delete meal", variant: 'error' });
          });
      },
    });
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

  return (
    <div className="pt-6 md:pt-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">

      {/* Row 1: full-bleed hero + quick protein (mobile stacked; desktop 2/3 + 1/3) */}
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
                trainingDay={trainingDay}
                calorieOffset={calorieOffset}
                trainingOffset={trainingOffset}
                offsetSkipped={offsetSkipped}
                onToggleBumpSkip={onToggleBumpSkip}
            />
        </div>
        <div className="flex flex-col gap-6 px-6 md:px-0">
            <QuickProtein user={user} onLogAdded={onLogAdded} showToast={showToast} />
        </div>
      </div>

      {/* Row 2: Weekly Review Card */}
      <div className="w-full px-6 md:px-0">
        <WeeklyReviewCard />
      </div>

      {/* Row 3: Weekly Trend */}
      <div className="w-full px-6 md:px-0">
        <WeeklyTrend weeklyData={weeklyData} dailyGoal={dailyGoal} />
      </div>

      {/* Row 4: Meal Feed */}
      <div className="w-full px-6 md:px-0">
        <MealFeed
            logs={visibleTodaysLogs}
            onEditLog={onEditLog}
            onDeleteLog={handleDeleteLog}
            onAnalyzeDay={handleAnalyzeDay}
            onAddMeal={onAddMeal}
        />
      </div>

      {/* Row 5: Hydration (demoted) */}
      <div className="w-full px-6 md:px-0">
        <HydrationTracker waterIntake={dailyStats.water_intake} onUpdateWater={handleUpdateWater} />
      </div>

      {/* AI Modal */}
      <Sheet open={aiModal.open} onClose={() => setAiModal({ ...aiModal, open: false })}>
        <div className="flex flex-col items-center text-center">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
            aiModal.type === 'suggestion' ? 'bg-training-soft-border text-training-text' : 'bg-ai-soft-border text-ai'
          }`}>
            {aiModal.loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : aiModal.type === 'suggestion' ? (
              <Sparkles className="w-6 h-6" />
            ) : (
              <Brain className="w-6 h-6" />
            )}
          </div>
          
          <h3 className="text-lg font-bold text-foreground mb-2">
            {aiModal.loading ? 'Thinking...' :
             aiModal.step === 'confirm' ? (aiModal.type === 'suggestion' ? 'Chef Suggestion' : 'Daily Overview') :
             (aiModal.type === 'suggestion' ? "Chef Gemini Suggests" : "Daily Insights")}
          </h3>

          <div className="text-muted-foreground text-sm leading-relaxed w-full">
            {aiModal.loading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-2 bg-muted rounded w-3/4 mx-auto"></div>
                <div className="h-2 bg-muted rounded w-full"></div>
                <div className="h-2 bg-muted rounded w-5/6 mx-auto"></div>
              </div>
            ) : (
              <div className={`whitespace-pre-line ${aiModal.step === 'result' ? 'bg-muted p-4 rounded-xl text-left border border-border' : 'text-center px-2'}`}>
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
                    className="flex-1 py-3 bg-muted text-muted-foreground rounded-xl font-medium hover:bg-muted/80 active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={performAiAction}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 active:scale-95 transition-all"
                  >
                    Generate
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setAiModal({ ...aiModal, open: false })}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 active:scale-95 transition-all"
                >
                  Got it
                </button>
              )}
            </div>
          )}
        </div>
      </Sheet>

      {toastEl}

    </div>
  );
};
