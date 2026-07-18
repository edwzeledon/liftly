'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LandingPage from '@/components/landing-page/LandingPage';
import Logo from '@/components/ui/Logo';

export default function RootPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Dynamic import keeps supabase-js out of the landing route's initial
    // bundle; the session check pays one extra async hop, nothing visible.
    import('@/lib/supabaseClient').then(({ supabase }) =>
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (cancelled) return;
        if (session?.user) {
          router.replace('/today');
        } else {
          setChecking(false);
        }
      })
    );
    return () => { cancelled = true; };
  }, [router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background" role="status">
        <span className="sr-only">Loading</span>
        <div aria-hidden="true" className="animate-pulse motion-reduce:animate-none">
          <Logo size={48} />
        </div>
      </div>
    );
  }
  return <LandingPage />;
}
