'use client';

import { useRouter } from 'next/navigation';
import AddFood from '@/components/AddFood';
import { useApp } from '@/components/app/AppProvider';

export default function AddPage() {
  const app = useApp();
  const router = useRouter();
  return (
    <AddFood
      user={app.user}
      initialScanCount={app.scanCount}
      onSuccess={() => {
        app.fetchData();
        router.push('/today');
      }}
      onCancel={() => router.push('/today')}
    />
  );
}
