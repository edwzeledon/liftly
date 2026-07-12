'use client';

import React from 'react';
import { Lock } from 'lucide-react';

const Card = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
    <h3 className="font-display text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
      {Icon && <Icon className="w-5 h-5 text-slate-400" />}
      {title}
    </h3>
    {children}
  </div>
);

export function LockedCard({ title, icon, daysLogged, daysNeeded = 7, onCta }) {
  const remaining = Math.max(0, daysNeeded - daysLogged);
  const pct = Math.min(100, Math.max(0, (daysLogged / daysNeeded) * 100));
  return (
    <Card title={title} icon={icon}>
      <div className="relative h-40 flex flex-col items-center justify-center text-center">
        <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,80 C40,60 60,90 100,70 S180,30 220,50 S280,20 300,35" fill="none" stroke="#cbd5e1" strokeWidth="2" />
        </svg>
        <Lock className="w-6 h-6 text-slate-300 mb-2" />
        <p className="text-sm font-semibold text-slate-500">
          Log protein {remaining} more {remaining === 1 ? 'day' : 'days'} to unlock — {daysLogged}/{daysNeeded}
        </p>
        <div className="w-40 h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
          <div className="h-full bg-protein rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <button onClick={onCta} className="mt-3 text-xs font-bold text-protein-strong">Log protein →</button>
      </div>
    </Card>
  );
}

export function EmptyCard({ title, icon, message = 'Not enough data for this range' }) {
  return (
    <Card title={title} icon={icon}>
      <div className="h-40 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl">
        <p className="text-sm text-slate-400">{message}</p>
      </div>
    </Card>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-slate-100 rounded w-1/3" />
        <div className="h-40 bg-slate-50 rounded-2xl" />
      </div>
    </div>
  );
}

export { Card as InsightCard };
