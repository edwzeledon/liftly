import React from 'react';
import { Utensils } from 'lucide-react';
import Logo from './ui/Logo';

export default function Header({ user }) {
  return (
    <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10 sticky top-0">
      <div className="flex items-center gap-2">
        <Logo size={36} />
        <h1 className="text-xl font-bold text-training-text">
          Liftly
        </h1>
      </div>
      <div className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
        {user ? 'Syncing' : 'Offline'}
      </div>
    </header>
  );
}
