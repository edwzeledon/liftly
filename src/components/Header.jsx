import React from 'react';
import { Utensils } from 'lucide-react';

export default function Header({ user }) {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10 sticky top-0">
      <div className="flex items-center gap-2">
        <div className="bg-indigo-600 p-2 rounded-lg">
          <Utensils className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-indigo-600 to-purple-600">
          Liftly
        </h1>
      </div>
      <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
        {user ? 'Syncing' : 'Offline'}
      </div>
    </header>
  );
}
