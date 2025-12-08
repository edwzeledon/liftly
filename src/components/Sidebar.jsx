'use client';

import React, { useState } from 'react';
import { Utensils, Home, Plus, Calendar, LogOut, Settings } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, onLogout }) {
  return (
    <div className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 p-6 h-full shrink-0">
      <div className="flex items-center gap-2 mb-10">
        <div className="bg-indigo-600 p-2 rounded-lg">
          <Utensils className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-indigo-600 to-purple-600">
          SnapCal
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
