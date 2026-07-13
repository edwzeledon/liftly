'use client';

import React from 'react';
import { Dumbbell } from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, BarChart, LineChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import InsightTooltip from './InsightTooltip';
import { InsightCard, EmptyCard } from './ChartStates';
import { AXIS_TICK, SERIES, gridProps } from './chartTheme';

const fmtWk = (w) => new Date(w + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function VolumeProteinCard({ data }) {
  const rows = (data.weeks || []).map((w) => ({ ...w, label: fmtWk(w.weekStart) }));
  if (rows.filter((r) => r.volume > 0 || r.avgProtein > 0).length < 2) {
    return <EmptyCard title="Volume vs Protein" icon={Dumbbell} />;
  }
  const tooltip = (
    <Tooltip content={<InsightTooltip formatter={(e) =>
      e.dataKey === 'volume' ? `Volume: ${e.value.toLocaleString()} lb` : `Protein: ${e.value} g/day avg`} />} />
  );
  return (
    <InsightCard title="Volume vs Protein" icon={Dumbbell}>
      {/* Mobile: aligned small multiples */}
      <div className="md:hidden space-y-1" aria-label="Weekly training volume compared with average daily protein">
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={rows} syncId="volpro">
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" hide />
            <YAxis hide />
            {tooltip}
            <Bar dataKey="volume" name="Volume" fill={SERIES.volumeBars} radius={[6, 6, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height={110}>
          <LineChart data={rows} syncId="volpro">
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} minTickGap={30} />
            <YAxis hide />
            {tooltip}
            <Line dataKey="avgProtein" name="Protein" stroke={SERIES.proteinLine} strokeWidth={2.5} dot isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Desktop: combined overlay */}
      <div className="hidden md:block" aria-label="Weekly training volume compared with average daily protein">
        <ResponsiveContainer width="100%" height={288}>
          <ComposedChart data={rows}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} minTickGap={30} />
            <YAxis yAxisId="v" hide />
            <YAxis yAxisId="p" hide orientation="right" />
            {tooltip}
            <Bar yAxisId="v" dataKey="volume" name="Volume" fill={SERIES.volumeBars} radius={[6, 6, 0, 0]} maxBarSize={28} isAnimationActive={false} />
            <Line yAxisId="p" dataKey="avgProtein" name="Protein" stroke={SERIES.proteinLine} strokeWidth={2.5} dot isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-2 text-xs font-semibold">
        <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-3 h-3 rounded bg-slate-200 inline-block" />Weekly volume (lb)</span>
        <span className="flex items-center gap-1.5 text-protein-text"><span className="w-3 h-1 rounded bg-protein inline-block" />Avg protein (g/day)</span>
      </div>
    </InsightCard>
  );
}
