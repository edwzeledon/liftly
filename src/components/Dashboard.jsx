'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { deleteLog } from '@/lib/api';
import DailyProgress from './dashboard/DailyProgress';
import MealFeed from './dashboard/MealFeed';
import QuickProtein from './dashboard/QuickProtein';
import TrainingCard from './dashboard/TrainingCard';
import WeeklyReviewCard from './dashboard/WeeklyReviewCard';
import DashboardSkeleton from './dashboard/DashboardSkeleton';
import { useToast } from '@/hooks/useToast';

export default function Dashboard({ caloriesToday, dailyGoal, macroGoals, todaysLogs, user, onLogDeleted, onUpdateGoal, onEditLog, onLogAdded, onAddMeal, streak, streakStatus, trainingDay = false, calorieOffset = 0, trainingOffset = 250, offsetSkipped = false, onToggleBumpSkip, loading = false }) {
  // Optimistically-hidden meal rows: hidden immediately, the real deleteLog runs
  // on the toast's onCommit (undo unhides before commit fires).
  const [hiddenLogIds, setHiddenLogIds] = useState(new Set());
  const { toastEl, showToast } = useToast();

  // Memoized: a bare .filter() here would mint a new array every render and
  // defeat MealFeed's React.memo.
  const visibleTodaysLogs = useMemo(
    () => todaysLogs.filter(log => !hiddenLogIds.has(log.id)),
    [todaysLogs, hiddenLogIds]
  );

  const unhideLog = useCallback((logId) => {
    setHiddenLogIds(prev => {
      const next = new Set(prev);
      next.delete(logId);
      return next;
    });
  }, []);

  const handleDeleteLog = useCallback((logId) => {
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
  }, [user, showToast, onLogDeleted, unhideLog]);

  // Data window (initial load / post-sign-in, cache miss): the layout shell is
  // up but app data hasn't landed — mirror the grid so content swaps in with
  // zero reflow. Background refetches never re-raise `loading`.
  if (loading) {
    return (
      <div className="pt-6 md:pt-0 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
        <div className="hidden md:flex items-baseline justify-between mb-6">
          <h2 className="font-display text-2xl font-bold text-foreground">Today</h2>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="pt-6 md:pt-0 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">

      {/* Desktop-only header row (mobile keeps the app header) */}
      <div className="hidden md:flex items-baseline justify-between mb-6">
        <h2 className="font-display text-2xl font-bold text-foreground">Today</h2>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Twin-heroes grid: DOM order = desktop placement (6/6, 12, 8/4);
          order-* utilities keep the mobile stack: hero, training, chips,
          review, meals. */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="order-1 lg:order-none lg:col-span-6">
          <DailyProgress
            caloriesToday={caloriesToday}
            dailyGoal={dailyGoal}
            macroGoals={macroGoals}
            todaysLogs={todaysLogs}
            onUpdateGoal={onUpdateGoal}
            streak={streak}
            streakStatus={streakStatus}
            trainingDay={trainingDay}
            calorieOffset={calorieOffset}
            trainingOffset={trainingOffset}
            offsetSkipped={offsetSkipped}
            onToggleBumpSkip={onToggleBumpSkip}
          />
        </div>

        <div className="order-2 lg:order-none lg:col-span-6 px-6 md:px-0">
          <TrainingCard />
        </div>

        <div className="order-3 lg:order-none lg:col-span-12 px-6 md:px-0">
          <QuickProtein user={user} onLogAdded={onLogAdded} showToast={showToast} />
        </div>

        <div className="order-5 lg:order-none lg:col-span-8 px-6 md:px-0">
          <MealFeed
            logs={visibleTodaysLogs}
            onEditLog={onEditLog}
            onDeleteLog={handleDeleteLog}
            onAddMeal={onAddMeal}
          />
        </div>

        <div className="order-4 lg:order-none lg:col-span-4 px-6 md:px-0">
          <WeeklyReviewCard />
        </div>
      </div>

      {toastEl}

    </div>
  );
};
