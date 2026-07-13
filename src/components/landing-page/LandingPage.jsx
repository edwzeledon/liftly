'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import PhotoBackdrop from './PhotoBackdrop';
import HeroContent from './HeroContent';
import Sections from './sections';
import AuthView from './AuthView';
import Logo from '../ui/Logo';

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);

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
    <div className={`bg-background text-foreground ${showAuth ? 'h-dvh overflow-hidden' : 'min-h-screen'}`}>
      {/* Nav hidden entirely during auth — AuthView owns its own top bar (Back + logo) */}
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
            <motion.div key="hero" className="absolute inset-0">
              <HeroContent onCtaClick={() => setShowAuth(true)} onSecondaryClick={scrollToFeatures} />
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Nothing below auth — sections unmount entirely */}
      {!showAuth && <Sections onCtaClick={() => setShowAuth(true)} />}
    </div>
  );
}
