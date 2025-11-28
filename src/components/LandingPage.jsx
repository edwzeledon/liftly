'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HeroSection } from '@/components/Hero';
import Pricing from '@/components/Pricing';
import { Utensils } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Utensils className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900">SnapCal</span>
        </div>
        <Link 
          href="/auth"
          className="px-5 py-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-full text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors"
        >
          Sign In
        </Link>
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
          href: "/auth"
        }}
        onCtaClick={() => router.push('/auth')}
        backgroundImage="https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=2670&auto=format&fit=crop"
        contactInfo={{
          website: "snapcal.app",
          phone: "",
          address: ""
        }}
      />

      {/* Features Grid */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-bold text-xl">📸</div>
              <h3 className="text-xl font-bold text-slate-900">Instant AI Analysis</h3>
              <p className="text-slate-500 leading-relaxed">Forget searching through databases. Just snap a photo and get instant calorie and macro breakdowns.</p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 font-bold text-xl">🥗</div>
              <h3 className="text-xl font-bold text-slate-900">Smart Suggestions</h3>
              <p className="text-slate-500 leading-relaxed">Not sure what to eat next? Get personalized meal suggestions based on your remaining daily goals.</p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 font-bold text-xl">📊</div>
              <h3 className="text-xl font-bold text-slate-900">Progress Tracking</h3>
              <p className="text-slate-500 leading-relaxed">Visualize your journey with beautiful weekly charts and daily macro breakdowns.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <Pricing onGetStarted={() => router.push('/auth')} />

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-white" />
            <span className="text-white font-bold">SnapCal</span>
          </div>
          <p className="text-sm">© 2025 SnapCal. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
