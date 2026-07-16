'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Plus, Calendar, Settings, Dumbbell, BarChart3, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useApp } from '@/components/app/AppProvider';
import Logo from './ui/Logo';

const NAV_ITEMS = [
  { href: '/today', icon: Home, label: 'Today' },
  { href: '/train', icon: Dumbbell, label: 'Train' },
  { href: '/insights', icon: BarChart3, label: 'Insights' },
  { href: '/history', icon: Calendar, label: 'History' },
];

const COLLAPSE_KEY = 'liftly_sidebar_collapsed';

// 21st.dev-style collapsible rail: w-64 expanded / w-16 icon rail, persisted
// per browser. Labels clip (overflow-hidden + nowrap) during the width
// transition instead of popping. Collapsed state hydrates in a mount effect
// so SSR markup always matches the first client render.
export default function Sidebar({ onOpenLog }) {
  const pathname = usePathname();
  const app = useApp();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: hydrate collapsed state from localStorage to avoid SSR mismatch
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      localStorage.setItem(COLLAPSE_KEY, prev ? '0' : '1');
      return !prev;
    });
  };

  const email = app.user?.email || '';
  const initial = (email[0] || '?').toUpperCase();
  const settingsActive = pathname === '/settings';

  const itemClass = (active) =>
    `relative w-full flex items-center gap-3 p-3 rounded-xl transition-all min-h-11 ${
      collapsed ? 'justify-center' : ''
    } ${active ? 'bg-training-soft text-training-text font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`;

  const accentBar = (
    <span aria-hidden="true" className="absolute left-0 inset-y-2 w-0.5 rounded-full bg-training" />
  );

  return (
    <div
      className={`hidden md:flex flex-col bg-card border-r border-border h-full shrink-0 overflow-hidden transition-[width] duration-200 ${
        collapsed ? 'w-16 p-2' : 'w-64 p-6'
      }`}
    >
      <div className={`flex items-center mb-10 ${collapsed ? 'flex-col gap-2' : 'gap-2'}`}>
        <Logo size={collapsed ? 32 : 40} className="rounded-xl shrink-0" />
        {!collapsed && (
          <h1 className="text-xl font-bold text-training-text whitespace-nowrap flex-1">Liftly</h1>
        )}
        <button
          onClick={toggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="rounded-lg text-faint hover:text-foreground hover:bg-muted transition-colors min-h-11 min-w-11 flex items-center justify-center"
        >
          {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
      </div>

      <nav className="flex-1 space-y-2">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              aria-current={active ? 'page' : undefined}
              className={itemClass(active)}
            >
              {active && accentBar}
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{label}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={onOpenLog}
        title={collapsed ? 'Log' : undefined}
        className={`w-full flex items-center justify-center gap-2 py-3 mb-2 bg-training text-white font-bold rounded-xl hover:bg-training/90 active:scale-95 transition-all min-h-11 ${
          collapsed ? 'px-0' : ''
        }`}
      >
        <Plus className="w-5 h-5 shrink-0" />
        {!collapsed && <span>Log</span>}
      </button>

      <div className="border-t border-border pt-2 space-y-1">
        <Link
          href="/settings"
          title={collapsed ? 'Settings' : undefined}
          aria-current={settingsActive ? 'page' : undefined}
          className={itemClass(settingsActive)}
        >
          {settingsActive && accentBar}
          <Settings className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">Settings</span>}
        </Link>

        <Link
          href="/settings"
          title={collapsed ? (email || 'Account') : undefined}
          className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors text-muted-foreground hover:bg-muted hover:text-foreground min-h-11 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <span
            aria-hidden="true"
            className="w-8 h-8 rounded-full bg-training-soft text-training-text font-bold text-sm flex items-center justify-center shrink-0"
          >
            {initial}
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground truncate">{email || 'Account'}</span>
              <span className="block text-xs text-faint whitespace-nowrap">View account</span>
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}
