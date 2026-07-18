'use client';

import { useRouter } from 'next/navigation';
import Dashboard from '@/components/Dashboard';
import { useApp } from '@/components/app/AppProvider';

export default function TodayPage() {
  const app = useApp();
  const router = useRouter();
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
      onLogDeleted={app.fetchData}
      onUpdateGoal={app.handleUpdateGoal}
      onEditLog={app.setEditingLog}
      onLogAdded={app.fetchData}
      onAddMeal={() => router.push('/add')}
      trainingDay={app.isTrainingDay}
      calorieOffset={app.calorieOffset}
      trainingOffset={app.trainingOffset}
      offsetSkipped={app.offsetSkipped}
      onToggleBumpSkip={app.handleToggleBumpSkip}
    />
  );
}
