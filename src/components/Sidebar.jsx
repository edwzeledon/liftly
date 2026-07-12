'use client';

import React, { useState } from 'react';
import { Home, Plus, Calendar, LogOut, Settings, Dumbbell, BarChart3 } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, onLogout, onOpenLog }) {
  return (
    <div className="hidden md:flex flex-col w-64 bg-card border-r border-border p-6 h-full shrink-0">
      <div className="flex items-center gap-2 mb-10">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-600">
          <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M 75 18 H 35 C 22 18, 15 25, 15 38 V 62 C 15 75, 22 82, 35 82 H 65 C 78 82, 85 75, 85 62 V 38" stroke="#EBE9E4" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="56" cy="50" r="14" fill="#EBE9E4" style={{ opacity: 0.25 }} />
            <circle cx="50" cy="50" r="14" fill="#EBE9E4" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-training-text">
          Liftly
        </h1>
      </div>

      <nav className="flex-1 space-y-2">
        <button
          onClick={() => setActiveTab('home')}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
            activeTab === 'home' ? 'bg-training-soft text-training-text font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Today</span>
        </button>

        <button
          onClick={() => setActiveTab('workouts')}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
            activeTab === 'workouts' ? 'bg-training-soft text-training-text font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Dumbbell className="w-5 h-5" />
          <span>Train</span>
        </button>

        <button
          onClick={() => setActiveTab('insights')}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
            activeTab === 'insights' ? 'bg-training-soft text-training-text font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span>Insights</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
            activeTab === 'history' ? 'bg-training-soft text-training-text font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span>History</span>
        </button>
      </nav>

      <button
        onClick={onOpenLog}
        className="w-full flex items-center justify-center gap-2 py-3 mb-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200"
      >
        <Plus className="w-5 h-5" />
        <span>Log</span>
      </button>

      <div className="border-t border-border pt-2 space-y-1">
        <button
          onClick={() => setActiveTab('settings')}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
            activeTab === 'settings' ? 'bg-training-soft text-training-text font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>

        <button
          onClick={onLogout}
          className="flex items-center gap-3 text-muted-foreground hover:text-destructive-text p-3 rounded-xl hover:bg-destructive/10 transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
