'use client';

import React from 'react';
import { Home, Plus, Calendar, LogOut, Settings, Dumbbell, BarChart3 } from 'lucide-react';
import Logo from './ui/Logo';

export default function Sidebar({ activeTab, setActiveTab, onLogout, onOpenLog }) {
  return (
    <div className="hidden md:flex flex-col w-64 bg-card border-r border-border p-6 h-full shrink-0">
      <div className="flex items-center gap-2 mb-10">
        <Logo size={40} className="rounded-xl" />
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
        className="w-full flex items-center justify-center gap-2 py-3 mb-2 bg-training text-white font-bold rounded-xl hover:bg-training/90 active:scale-95 transition-all"
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
