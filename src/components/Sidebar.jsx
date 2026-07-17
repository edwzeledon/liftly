'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Plus, Calendar, Settings, Dumbbell, BarChart3 } from 'lucide-react';
import { useApp } from '@/components/app/AppProvider';
import { SidebarRail, SidebarRailLabel } from './ui/SidebarRail';
import Logo from './ui/Logo';

const NAV_ITEMS = [
  { href: '/today', icon: Home, label: 'Today' },
  { href: '/train', icon: Dumbbell, label: 'Train' },
  { href: '/insights', icon: BarChart3, label: 'Insights' },
  { href: '/history', icon: Calendar, label: 'History' },
];

// 21st.dev Aceternity hover-expand rail, poster-nav skin: condensed display
// caps, solid training block on the active route, ghost route numerals.
// Labels fade opacity-only (never display:none) and rows stay left-anchored,
// so icon positions are independent of rail width; every control carries an
// aria-label for the icon-only resting state.
export default function Sidebar({ onOpenLog }) {
  const pathname = usePathname();
  const app = useApp();

  const email = app.user?.email || '';
  const initial = (email[0] || '?').toUpperCase();
  const settingsActive = pathname === '/settings';

  const itemClass = (active) =>
    `flex items-center gap-3 p-3 rounded-xl transition-colors min-h-11 ${
      active
        ? 'bg-training text-white'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`;

  const labelClass = 'font-display font-bold uppercase tracking-wide text-lg';

  return (
    <SidebarRail>
      <div className="flex items-center gap-2 mb-10 p-1">
        <Logo size={32} className="rounded-xl shrink-0" />
        <SidebarRailLabel className="font-display font-bold uppercase tracking-wide text-2xl text-training-text">
          Liftly
        </SidebarRailLabel>
      </div>

      <nav className="flex-1 space-y-2">
        {NAV_ITEMS.map(({ href, icon: Icon, label }, i) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={itemClass(active)}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <SidebarRailLabel className={labelClass}>{label}</SidebarRailLabel>
              {/* Ghost route numeral — permanently decorative, so the plain
                  outer span owns aria-hidden and the flex push-right; ml-auto
                  resolves to zero margin at the 4rem resting width, keeping
                  icons anchored. */}
              <span aria-hidden="true" className="ml-auto pl-3">
                <SidebarRailLabel
                  className={`font-display font-bold text-lg tabular-nums leading-none ${
                    active ? 'text-white/25' : 'text-foreground/15'
                  }`}
                >
                  {String(i + 1).padStart(2, '0')}
                </SidebarRailLabel>
              </span>
            </Link>
          );
        })}
      </nav>

      <button
        onClick={onOpenLog}
        aria-label="Quick log"
        className="w-full flex items-center gap-3 p-3 mb-2 bg-training text-white rounded-xl hover:bg-training/90 active:scale-95 transition-all min-h-11"
      >
        <Plus className="w-5 h-5 shrink-0" />
        <SidebarRailLabel className={labelClass}>Log</SidebarRailLabel>
      </button>

      <div className="border-t border-border pt-2 space-y-1">
        <Link
          href="/settings"
          aria-label="Settings"
          aria-current={settingsActive ? 'page' : undefined}
          className={itemClass(settingsActive)}
        >
          <Settings className="w-5 h-5 shrink-0" />
          <SidebarRailLabel className={labelClass}>Settings</SidebarRailLabel>
        </Link>

        <Link
          href="/settings"
          aria-label="Account settings"
          className="flex items-center gap-3 p-2 rounded-xl transition-colors text-muted-foreground hover:bg-muted hover:text-foreground min-h-11"
        >
          <span
            aria-hidden="true"
            className="w-8 h-8 rounded-full bg-training-soft text-training-text font-bold text-sm flex items-center justify-center shrink-0"
          >
            {initial}
          </span>
          <SidebarRailLabel className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-foreground truncate">{email || 'Account'}</span>
            <span className="block text-xs text-faint">View account</span>
          </SidebarRailLabel>
        </Link>
      </div>
    </SidebarRail>
  );
}
