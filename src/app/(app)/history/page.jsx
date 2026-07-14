'use client';

import HistoryView from '@/components/HistoryView';
import { useApp } from '@/components/app/AppProvider';

export default function HistoryPage() {
  const app = useApp();
  return (
    <HistoryView
      logs={app.logs}
      workoutLogs={app.workoutLogs}
      user={app.user}
      onLogDeleted={app.fetchData}
      onEditLog={app.setEditingLog}
    />
  );
}
