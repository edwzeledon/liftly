'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Dashboard from '@/components/Dashboard';
import { useApp } from '@/components/app/AppProvider';

export default function TodayPage() {
  const app = useApp();
  const router = useRouter();
  // Stable identity — an inline arrow here would defeat MealFeed's React.memo.
  const onAddMeal = useCallback(() => router.push('/add'), [router]);
  return (
    <Dashboard
      caloriesToday={app.caloriesToday}
      dailyGoal={app.dailyGoal}
      macroGoals={app.macroGoals}
      todaysLogs={app.todaysLogs}
      user={app.user}
      loading={app.loading}
      streak={app.streak}
      streakStatus={app.streakStatus}
      onLogDeleted={app.refreshLogs}
      onUpdateGoal={app.handleUpdateGoal}
      onEditLog={app.setEditingLog}
      onLogAdded={app.refreshLogs}
      onAddMeal={onAddMeal}
      trainingDay={app.isTrainingDay}
      calorieOffset={app.calorieOffset}
      trainingOffset={app.trainingOffset}
      offsetSkipped={app.offsetSkipped}
      onToggleBumpSkip={app.handleToggleBumpSkip}
    />
  );
}
