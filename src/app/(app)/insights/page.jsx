'use client';

import { useRouter } from 'next/navigation';
import InsightsView from '@/components/insights/InsightsView';
import { useApp } from '@/components/app/AppProvider';

export default function InsightsPage() {
  const app = useApp();
  const router = useRouter();
  return <InsightsView user={app.user} onGoLogProtein={() => router.push('/today')} />;
}
