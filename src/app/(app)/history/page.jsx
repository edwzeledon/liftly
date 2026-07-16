'use client';

import { useRouter } from 'next/navigation';
import HistoryView from '@/components/HistoryView';
import { useApp } from '@/components/app/AppProvider';

export default function HistoryPage() {
  const app = useApp();
  const router = useRouter();
  return (
    <HistoryView
      logs={app.logs}
      workoutLogs={app.workoutLogs}
      user={app.user}
      onLogDeleted={app.fetchData}
      onEditLog={app.setEditingLog}
      weightUnit={app.weightUnit}
      loading={app.loading}
      staleData={app.staleData}
      onRetry={app.fetchData}
      onLogCta={(mode) => router.push(mode === 'meals' ? '/add' : '/train')}
    />
  );
}
