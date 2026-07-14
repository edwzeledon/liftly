'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import LandingPage from '@/components/landing-page/LandingPage';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user) {
        router.replace('/today');
      } else {
        setChecking(false);
      }
    });
    return () => { cancelled = true; };
  }, [router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 text-training-text animate-spin" />
      </div>
    );
  }
  return <LandingPage />;
}
