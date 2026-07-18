'use client';

import WorkoutView from '@/components/workout/WorkoutView';
import { useApp } from '@/components/app/AppProvider';

export default function TrainPage() {
  const app = useApp();
  return (
    <WorkoutView
      user={app.user}
      workoutsReady={app.workoutsReady}
      onWorkoutComplete={app.refreshWorkouts}
      initialLogs={app.activeWorkoutLogs || []}
      onUpdateLogs={app.setActiveWorkoutLogs}
      weightUnit={app.weightUnit}
      historyLogs={app.workoutLogs}
    />
  );
}
