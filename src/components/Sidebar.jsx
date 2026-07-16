'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Plus, Calendar, Settings, Dumbbell, BarChart3 } from 'lucide-react';
import Logo from './ui/Logo';

// R3: pathname-based nav. The sidebar no longer receives tab-key props; it
// renders real <Link>s and derives the active item from usePathname().
const NAV_ITEMS = [
  { href: '/today', icon: Home, label: 'Today' },
  { href: '/train', icon: Dumbbell, label: 'Train' },
  { href: '/insights', icon: BarChart3, label: 'Insights' },
  { href: '/history', icon: Calendar, label: 'History' },
];

export default function Sidebar({ onOpenLog }) {
  const pathname = usePathname();
  const settingsActive = pathname === '/settings';

  return (
    <div className="hidden md:flex flex-col w-64 bg-card border-r border-border p-6 h-full shrink-0">
      <div className="flex items-center gap-2 mb-10">
        <Logo size={40} className="rounded-xl" />
        <h1 className="text-xl font-bold text-training-text">
          Liftly
        </h1>
      </div>

      <nav className="flex-1 space-y-2">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                active ? 'bg-training-soft text-training-text font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <button
        onClick={onOpenLog}
        className="w-full flex items-center justify-center gap-2 py-3 mb-2 bg-training text-white font-bold rounded-xl hover:bg-training/90 active:scale-95 transition-all"
      >
        <Plus className="w-5 h-5" />
        <span>Log</span>
      </button>

      <div className="border-t border-border pt-2 space-y-1">
        <Link
          href="/settings"
          aria-current={settingsActive ? 'page' : undefined}
          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
            settingsActive ? 'bg-training-soft text-training-text font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </Link>

      </div>
    </div>
  );
}
