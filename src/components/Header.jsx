import React from 'react';
import { Utensils } from 'lucide-react';

export default function Header({ user }) {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10 sticky top-0">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-indigo-600">
          <svg width="20" height="20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M 75 18 H 35 C 22 18, 15 25, 15 38 V 62 C 15 75, 22 82, 35 82 H 65 C 78 82, 85 75, 85 62 V 38" stroke="#EBE9E4" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="56" cy="50" r="14" fill="#EBE9E4" style={{ opacity: 0.25 }} />
            <circle cx="50" cy="50" r="14" fill="#EBE9E4" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-indigo-600">
          Liftly
        </h1>
      </div>
      <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
        {user ? 'Syncing' : 'Offline'}
      </div>
    </header>
  );
}
