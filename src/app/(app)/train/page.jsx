'use client';

import WorkoutView from '@/components/workout/WorkoutView';
import { useApp } from '@/components/app/AppProvider';

export default function TrainPage() {
  const app = useApp();
  return (
    <WorkoutView
      user={app.user}
      onWorkoutComplete={app.fetchData}
      initialLogs={app.activeWorkoutLogs || []}
      onUpdateLogs={app.setActiveWorkoutLogs}
    />
  );
}
