'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Minus, Plus, LogOut, ChevronRight } from 'lucide-react';
import SegmentedControl from './ui/SegmentedControl';
import { useApp } from './app/AppProvider';

function Section({ title, children }) {
  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">{title}</h3>
      <div className="bg-card border border-border rounded-2xl divide-y divide-border">{children}</div>
    </section>
  );
}

function Row({ label, sub, children }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 min-h-11">
      <div className="min-w-0">
        <p className="font-semibold text-foreground text-sm">{label}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// Loading mirror: real page chrome + section shells with pulsing rows, per
// the house skeleton idiom (DashboardSkeleton).
function SettingsSkeleton() {
  return (
    <div role="status" className="p-6 md:p-8 max-w-2xl mx-auto space-y-8 pb-24 md:pb-8">
      <h2 className="font-display text-2xl font-bold text-foreground">Settings</h2>
      <span className="sr-only">Loading settings</span>
      {/* space-y lives here, not via a display:contents wrapper — contents
          would break the child-selector spacing. */}
      <div aria-hidden="true" className="space-y-8">
        {[3, 2, 2].map((count, si) => (
          <section key={si} className="animate-pulse motion-reduce:animate-none">
            <div className="h-3 w-28 bg-muted rounded mb-2 mx-1" />
            <div className="bg-card border border-border rounded-2xl divide-y divide-border">
              {Array.from({ length: count }).map((_, r) => (
                <div key={r} className="flex items-center justify-between gap-4 px-5 py-4 min-h-11">
                  <div className="min-w-0 space-y-1.5">
                    <div className="h-3 w-28 bg-muted rounded" />
                    <div className="h-2.5 w-40 bg-muted rounded" />
                  </div>
                  <div className="h-4 w-16 bg-muted rounded" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default function SettingsView({ onRetakeAssessment }) {
  const {
    user, dailyGoal, macroGoals, weightUnit, waterGoal,
    handleUpdatePreferences, handleLogout, showToast, loading,
  } = useApp();
  const [saving, setSaving] = useState(false);

  const savePreference = async (updates) => {
    if (saving) return;
    setSaving(true);
    const ok = await handleUpdatePreferences(updates);
    if (!ok) showToast({ message: "Couldn't save preference", variant: 'error' });
    setSaving(false);
  };

  // Cold sign-in window (settings not yet fetched, no cache): a skeleton is
  // honest — the alternative flashes default values (2000 kcal / lb / 8)
  // that flip once real settings land.
  if (loading) return <SettingsSkeleton />;

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-8 pb-24 md:pb-8 animate-in fade-in duration-300">
      <h2 className="font-display text-2xl font-bold text-foreground">Settings</h2>

      <Section title="Profile & Goals">
        <Row label="Daily calories" sub="Target from your assessment">
          <span className="font-display font-semibold tabular-nums text-foreground">{dailyGoal} kcal</span>
        </Row>
        <Row label="Macros" sub="Protein · Carbs · Fats">
          <span className="font-display font-semibold tabular-nums text-foreground">
            {macroGoals.protein}g · {macroGoals.carbs}g · {macroGoals.fats}g
          </span>
        </Row>
        <button
          onClick={onRetakeAssessment}
          className="w-full flex items-center justify-between gap-4 px-5 py-4 min-h-11 hover:bg-muted/50 transition-colors rounded-b-2xl text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-training-soft text-training-text rounded-lg"><RefreshCw className="w-4 h-4" /></div>
            <div>
              <p className="font-semibold text-foreground text-sm">Retake Assessment</p>
              <p className="text-xs text-muted-foreground">Update goals & measurements</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-faint" />
        </button>
      </Section>

      <Section title="Preferences">
        <Row label="Weight unit" sub="Applies to sets, PRs and charts">
          <SegmentedControl
            options={[{ value: 'lb', label: 'LB' }, { value: 'kg', label: 'KG' }]}
            value={weightUnit}
            onChange={(next) => { if (next !== weightUnit) savePreference({ weightUnit: next }); }}
          />
        </Row>
        <Row label="Hydration goal" sub="Glasses per day">
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
            <button
              onClick={() => savePreference({ waterGoal: waterGoal - 1 })}
              disabled={saving || waterGoal <= 4}
              aria-label="Decrease hydration goal"
              className="w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-lg disabled:opacity-40 transition-colors"
            ><Minus className="w-4 h-4" /></button>
            <span className="font-display font-semibold tabular-nums text-foreground w-6 text-center">{waterGoal}</span>
            <button
              onClick={() => savePreference({ waterGoal: waterGoal + 1 })}
              disabled={saving || waterGoal >= 16}
              aria-label="Increase hydration goal"
              className="w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-lg disabled:opacity-40 transition-colors"
            ><Plus className="w-4 h-4" /></button>
          </div>
        </Row>
      </Section>

      <Section title="Account">
        <Row label="Signed in as">
          <span className="text-sm text-muted-foreground truncate max-w-48">{user?.email}</span>
        </Row>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-5 py-4 min-h-11 text-destructive-text hover:bg-destructive/10 transition-colors rounded-b-2xl text-left"
        >
          <LogOut className="w-4 h-4" />
          <span className="font-semibold text-sm">Sign out</span>
        </button>
      </Section>

      <Section title="About">
        <Row label="Liftly" sub="Log lifts fast. Fuel them right." />
        <div className="flex gap-6 px-5 py-4">
          <Link href="/privacy" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">Privacy</Link>
          <Link href="/terms" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">Terms</Link>
        </div>
      </Section>
    </div>
  );
}
