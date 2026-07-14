'use client';

import React, { useState, useEffect } from 'react';
import { Dumbbell, Trophy, Scale, Plus, Check, X } from 'lucide-react';
import { getInsights, updateDailyStats } from '@/lib/api';
import { toLb } from '@/lib/units';
import SegmentedControl from '@/components/ui/SegmentedControl';
import { useToast } from '@/hooks/useToast';
import { LockedCard, SkeletonCard } from './ChartStates';
import VolumeProteinCard from './VolumeProteinCard';
import PrTimelineCard from './PrTimelineCard';
import WeightBalanceCard from './WeightBalanceCard';

const RANGES = [{ label: '4W', weeks: 4 }, { label: '8W', weeks: 8 }, { label: '12W', weeks: 12 }];
const UNLOCK_DAYS = 7;

// Minimal weight-entry affordance moved here from the retired WeightTrend card.
// Reuses the existing updateDailyStats API pattern; calls onSaved so the parent
// can refetch insights (the WeightBalanceCard picks up the new point).
function WeightEntry({ user, onSaved, weightUnit = 'lb' }) {
  const [isLogging, setIsLogging] = useState(false);
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const { toastEl, showToast } = useToast();

  const handleSave = async () => {
    if (!weight || !user || saving) return;
    const weightVal = parseFloat(weight);
    if (!Number.isFinite(weightVal) || weightVal <= 0) return;
    setSaving(true);
    try {
      await updateDailyStats({
        date: new Date().toLocaleDateString('en-CA'),
        weight: toLb(weightVal, weightUnit),
      });
      setIsLogging(false);
      setWeight('');
      if (onSaved) onSaved();
    } catch (error) {
      console.error('Error saving weight:', error);
      showToast({ message: "Couldn't save weight", variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <div className="bg-card rounded-2xl px-5 py-4 border border-border flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 min-w-0">
        <div className="p-2 bg-fat/15 rounded-xl text-fat shrink-0">
          <Scale className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground text-sm">Today&apos;s weight</p>
          <p className="text-xs text-faint truncate">Keep your trend up to date</p>
        </div>
      </div>
      {isLogging ? (
        <div className="flex items-center gap-2 animate-in slide-in-from-right-4 fade-in duration-300">
          <input
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            placeholder={weightUnit === 'kg' ? 'kg' : 'lb'}
            className="w-24 px-3 py-2 rounded-xl border-2 border-training-soft-border focus:border-ring focus:ring-2 focus:ring-ring outline-none font-bold text-foreground"
            autoFocus
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="p-2.5 bg-training text-white rounded-xl hover:bg-training/90 transition-colors disabled:opacity-60"
            aria-label="Save weight"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setIsLogging(false); setWeight(''); }}
            className="p-2.5 bg-muted text-muted-foreground rounded-xl hover:bg-muted/80 transition-colors"
            aria-label="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsLogging(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          Log Weight
        </button>
      )}
    </div>
    {toastEl}
    </>
  );
}

export default function InsightsView({ user, onGoLogProtein, weightUnit = 'lb' }) {
  const [range, setRange] = useState(4);
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: show the skeleton while a range/refresh change refetches.
    setState('loading');
    getInsights(range)
      .then((d) => { if (!cancelled) { setData(d); setState('ready'); } })
      .catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, [range, user?.id, refreshKey]);

  const locked = state === 'ready' && data.foodDaysLogged < UNLOCK_DAYS;

  return (
    <div className="p-6 md:p-0 space-y-6 max-w-3xl mx-auto pb-20 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-foreground">Insights</h2>
        <SegmentedControl
          options={RANGES.map((r) => ({ label: r.label, value: r.weeks }))}
          value={range}
          onChange={setRange}
        />
      </div>

      <WeightEntry user={user} onSaved={() => setRefreshKey((k) => k + 1)} weightUnit={weightUnit} />

      {state === 'loading' && (<><SkeletonCard /><SkeletonCard /><SkeletonCard /></>)}

      {state === 'error' && (
        <div className="bg-card rounded-2xl p-6 border border-border text-center">
          <p className="text-sm text-muted-foreground mb-3">Couldn&apos;t load insights.</p>
          <button
            onClick={() => { setState('loading'); setRefreshKey((k) => k + 1); }}
            className="px-4 py-2 bg-training text-white text-sm font-bold rounded-xl">
            Retry
          </button>
        </div>
      )}

      {state === 'ready' && locked && (
        <>
          <LockedCard title="Volume vs Protein" icon={Dumbbell} daysLogged={data.foodDaysLogged} daysNeeded={UNLOCK_DAYS} onCta={onGoLogProtein} />
          <LockedCard title="PRs & Fuel" icon={Trophy} daysLogged={data.foodDaysLogged} daysNeeded={UNLOCK_DAYS} onCta={onGoLogProtein} />
          <LockedCard title="Weight vs Calorie Balance" icon={Scale} daysLogged={data.foodDaysLogged} daysNeeded={UNLOCK_DAYS} onCta={onGoLogProtein} />
        </>
      )}

      {state === 'ready' && !locked && (
        <>
          <VolumeProteinCard data={data} unit={weightUnit} />
          <PrTimelineCard data={data} unit={weightUnit} />
          <WeightBalanceCard data={data} unit={weightUnit} />
        </>
      )}
    </div>
  );
}
