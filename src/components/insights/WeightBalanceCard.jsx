'use client';

import React from 'react';
import { Scale } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts';
import InsightTooltip from './InsightTooltip';
import { InsightCard, EmptyCard } from './ChartStates';
import { AXIS_TICK, REF_LINE, SERIES, gridProps } from './chartTheme';
import { toDisplay } from '@/lib/units';

const fmtDay = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function WeightBalanceCard({ data, unit = 'lb' }) {
  const rows = (data.weightSeries || []).map((r) => ({ ...r, weight: toDisplay(r.weight, unit) }));
  if (rows.length < 2) {
    return <EmptyCard title="Weight vs Calorie Balance" icon={Scale} message="Log your weight a few more days" />;
  }
  return (
    <InsightCard title="Weight vs Calorie Balance" icon={Scale}>
      <div aria-label="Body weight over daily calorie balance versus goal">
        <ResponsiveContainer width="100%" height={230}>
          <ComposedChart data={rows}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="date" tickFormatter={fmtDay} axisLine={false} tickLine={false} tick={AXIS_TICK} minTickGap={30} />
            <YAxis yAxisId="w" domain={['dataMin - 2', 'dataMax + 2']} axisLine={false} tickLine={false} tick={AXIS_TICK} width={36} />
            <YAxis yAxisId="b" hide />
            <Tooltip content={<InsightTooltip formatter={(e) =>
              e.dataKey === 'weight' ? `Weight: ${e.value} ${unit}` : `Balance: ${e.value > 0 ? '+' : ''}${e.value} kcal vs goal`} />}
              labelFormatter={fmtDay} />
            <ReferenceLine yAxisId="b" y={0} stroke={REF_LINE} strokeDasharray="3 3" />
            <Bar yAxisId="b" dataKey="balance" name="Balance" fillOpacity={SERIES.balanceOpacity} isAnimationActive={false} maxBarSize={16} radius={[3, 3, 0, 0]}>
              {rows.map((r) => (
                <Cell key={r.date} fill={r.balance > 0 ? SERIES.surplus : SERIES.deficit} />
              ))}
            </Bar>
            <Line yAxisId="w" dataKey="weight" name="Weight" stroke={SERIES.weightLine} strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-2 text-xs font-semibold text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-training-text inline-block" />Weight</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-deficit inline-block" />Deficit</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-surplus inline-block" />Surplus</span>
      </div>
    </InsightCard>
  );
}
