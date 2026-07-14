'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamicImport from 'next/dynamic';
import { AnimatePresence, LazyMotion, m } from 'framer-motion';
import PhotoBackdrop from './PhotoBackdrop';
import HeroContent from './HeroContent';
import Sections from './sections';
import Logo from '../ui/Logo';

const AuthView = dynamicImport(() => import('./AuthView'), { ssr: false, loading: () => null });
const loadFeatures = () => import('./motionFeatures').then((mod) => mod.default);

// Whitelist of in-app destinations a ?next= param may target. Anything else
// (external URLs, unknown paths, '/') falls through to the default /today —
// guards against open-redirect via the next param.
const APP_PATHS = ['/today', '/train', '/insights', '/history', '/add', '/settings'];
const validateNext = (n) => (APP_PATHS.includes(n) ? n : null);

// useSearchParams must live under Suspense (Next 15). Isolated here so the
// rest of LandingPage doesn't bail out of static rendering. Opens auth once
// per param appearance (ref latch), captures ?next= for post-sign-in routing,
// and cleans the URL immediately after.
function AuthParamListener({ onOpen, onNext }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const openedRef = useRef(false);

  useEffect(() => {
    const auth = searchParams.get('auth');
    const next = searchParams.get('next');
    if (auth === '1' && !openedRef.current) {
      openedRef.current = true;
      // Capture next BEFORE the URL is cleaned below (replace drops the param).
      onNext(next);
      onOpen();
      router.replace('/', { scroll: false });
    }
    if (auth !== '1') {
      // Param is gone (cleaned, or never present) — re-arm the latch so a
      // future ?auth=1 navigation (e.g. another /auth visit) can open again.
      openedRef.current = false;
    }
  }, [searchParams, onOpen, onNext, router]);

  return null;
}

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);
  const router = useRouter();
  // Post-sign-in destination captured from ?next=. A ref (not state) because it
  // must survive the URL-clean re-render and is only read imperatively in the
  // auth-transition effect below.
  const nextRef = useRef(null);
  const captureNext = useCallback((n) => { nextRef.current = n; }, []);

  // Auth-transition owner. The OLD SPA page.jsx re-rendered into the app when its
  // `user` state flipped on SIGNED_IN. After the flip the app lives behind
  // /today, so the landing must ACTIVELY navigate. LandingPage owns this (not the
  // root page) because it also owns `next` (captured by AuthParamListener above);
  // keeping capture + honor in one component avoids threading the value through
  // the deliberately-minimal root. On SIGNED_IN, route to the validated next or
  // /today. (Google OAuth returns to origin '/' with no next; the root page's
  // getSession redirect forwards it to /today — next is lost for OAuth, which is
  // acceptable since OAuth is only ever initiated from the generic Sign In CTA.)
  useEffect(() => {
    let subscription;
    let cancelled = false;
    import('@/lib/supabaseClient').then(({ supabase }) => {
      if (cancelled) return;
      ({ data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          router.replace(validateNext(nextRef.current) || '/today');
        }
      }));
    });
    return () => { cancelled = true; subscription?.unsubscribe(); };
  }, [router]);

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!showAuth) return;
    const onKey = (e) => e.key === 'Escape' && setShowAuth(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showAuth]);

  return (
    <LazyMotion features={loadFeatures} strict>
      <div className={`bg-background text-foreground ${showAuth ? 'h-dvh overflow-hidden' : 'min-h-screen'}`}>
        <Suspense fallback={null}>
          <AuthParamListener onOpen={() => setShowAuth(true)} onNext={captureNext} />
        </Suspense>
        {/* Nav hidden entirely during auth — AuthView owns its own top bar (logo left, close right) */}
        {!showAuth && (
          <nav className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowAuth(false)}>
              <Logo size={36} />
              <span className="text-xl font-bold text-training-text">Liftly</span>
            </div>
            <button
              onClick={() => setShowAuth(true)}
              className="px-5 py-2 bg-card/80 backdrop-blur-sm border border-border rounded-full text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Sign In
            </button>
          </nav>
        )}

        {/* The one full-viewport room: photo persists, content swaps */}
        <section className={`relative ${showAuth ? 'h-dvh' : 'min-h-dvh'}`}>
          <PhotoBackdrop deepen={showAuth} />
          <AnimatePresence mode="wait">
            {showAuth ? (
              <AuthView onBack={() => setShowAuth(false)} />
            ) : (
              <m.div key="hero" className="absolute inset-0">
                <HeroContent onCtaClick={() => setShowAuth(true)} onSecondaryClick={scrollToFeatures} />
              </m.div>
            )}
          </AnimatePresence>
        </section>

        {/* Nothing below auth — sections unmount entirely */}
        {!showAuth && <Sections onCtaClick={() => setShowAuth(true)} />}
      </div>
    </LazyMotion>
  );
}
