'use client';

import React, { useState } from 'react';
import { Utensils, Home, Plus, Calendar, LogOut, Settings, Dumbbell } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, onLogout }) {
  return (
    <div className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 p-6 h-full shrink-0">
      <div className="flex items-center gap-2 mb-10">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-600">
          <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M 75 18 H 35 C 22 18, 15 25, 15 38 V 62 C 15 75, 22 82, 35 82 H 65 C 78 82, 85 75, 85 62 V 38" stroke="#EBE9E4" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="56" cy="50" r="14" fill="#EBE9E4" style={{ opacity: 0.25 }} />
            <circle cx="50" cy="50" r="14" fill="#EBE9E4" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-indigo-600">
          Liftly
        </h1>
      </div>
      
      <nav className="flex-1 space-y-2">
        <button 
          onClick={() => setActiveTab('home')}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
            activeTab === 'home' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Dashboard</span>
        </button>

        <button 
          onClick={() => setActiveTab('workouts')}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
            activeTab === 'workouts' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Dumbbell className="w-5 h-5" />
          <span>Workouts</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('add')}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
            activeTab === 'add' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Plus className="w-5 h-5" />
          <span>Add Meal</span>
        </button>

        <button 
          onClick={() => setActiveTab('history')}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
            activeTab === 'history' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span>History</span>
        </button>

        <button 
          onClick={() => setActiveTab('settings')}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
            activeTab === 'settings' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>
      </nav>

      <button 
        onClick={onLogout}
        className="flex items-center gap-3 text-slate-500 hover:text-red-600 p-3 rounded-xl hover:bg-red-50 transition-colors mt-auto"
      >
        <LogOut className="w-5 h-5" />
        <span className="font-medium">Sign Out</span>
      </button>
    </div>
  );
}
