'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HeroSection } from './Hero';
import AuthScreen from '../AuthScreen';
import { Utensils } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowAuth(false)}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-indigo-600">
            <svg width="20" height="20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M 75 18 H 35 C 22 18, 15 25, 15 38 V 62 C 15 75, 22 82, 35 82 H 65 C 78 82, 85 75, 85 62 V 38" stroke="#EBE9E4" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="56" cy="50" r="14" fill="#EBE9E4" style={{ opacity: 0.25 }} />
              <circle cx="50" cy="50" r="14" fill="#EBE9E4" />
            </svg>
          </div>
          <span className="text-xl font-bold text-indigo-600">Liftly</span>
        </div>
        {!showAuth && (
          <button 
            onClick={() => setShowAuth(true)}
            className="px-5 py-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-full text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors"
          >
            Sign In
          </button>
        )}
      </nav>

      {/* Hero Section */}
      <HeroSection
        title={
          <>
            Snap Your Food. <br />
            <span className="text-indigo-600">Track Your Health.</span>
          </>
        }
        subtitle="The AI-powered calorie tracker that makes nutrition simple. Just take a photo, and let our advanced AI analyze your meal's calories and macros instantly."
        callToAction={{
          text: "Start Tracking Free",
          href: "#"
        }}
        onCtaClick={() => setShowAuth(true)}
        backgroundImage="https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=2670&auto=format&fit=crop"
      >
        {showAuth && (
          <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AuthScreen embedded={true} />
          </div>
        )}
      </HeroSection>
    </div>
  );
}
