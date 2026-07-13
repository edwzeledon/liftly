'use client';

import React from 'react';
import { Trophy } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot } from 'recharts';
import InsightTooltip from './InsightTooltip';
import { InsightCard, EmptyCard } from './ChartStates';
import { AXIS_TICK, SERIES, gridProps } from './chartTheme';

const fmtDay = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function PrTimelineCard({ data }) {
  const prEvents = data.prEvents || [];
  const weightSeries = data.weightSeries || [];
  // Build a daily calorie series from weightSeries days + PR days (both carry day nutrition)
  const dayMap = {};
  weightSeries.forEach((s) => { dayMap[s.date] = { date: s.date, calories: s.balance != null ? s.balance + data.dailyGoal : null }; });
  prEvents.forEach((p) => { if (p.dayCalories != null) dayMap[p.date] = { date: p.date, calories: p.dayCalories }; });
  const series = Object.values(dayMap).filter((d) => d.calories != null).sort((a, b) => a.date.localeCompare(b.date));

  if (!prEvents.length) {
    return <EmptyCard title="PRs & Fuel" icon={Trophy} message="No PRs in this range yet — go lift!" />;
  }

  return (
    <InsightCard title="PRs & Fuel" icon={Trophy}>
      {series.length >= 2 && (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={series} aria-label="Daily calories with strength PR markers">
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="date" tickFormatter={fmtDay} axisLine={false} tickLine={false} tick={AXIS_TICK} minTickGap={30} />
            <YAxis hide />
            <Tooltip content={<InsightTooltip formatter={(e) => `Calories: ${e.value}`} />} labelFormatter={fmtDay} />
            <Line dataKey="calories" name="Calories" stroke={SERIES.caloriesContext} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            {/* Anchor each dot to the plotted series value for its date; PRs with no
                plottable calories stay list-only (the accessible PR list covers them). */}
            {prEvents.map((p) => {
              const yVal = dayMap[p.date]?.calories;
              if (yVal == null) return null;
              return (
                <ReferenceDot key={p.exercise + p.date} x={p.date} y={yVal} r={6}
                  fill={SERIES.prDot} stroke={SERIES.prDotHalo} strokeWidth={2} isFront />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      )}
      {/* Accessible PR list (also the touch fallback) */}
      <ul className="mt-3 divide-y divide-border">
        {[...prEvents].reverse().slice(0, 6).map((p) => (
          <li key={p.exercise + p.date} className="py-2.5 flex items-center justify-between text-sm">
            <div>
              <p className="font-semibold text-foreground">{p.exercise} — <span className="tabular-nums">{p.weight}×{p.reps}</span></p>
              <p className="text-xs text-faint">{fmtDay(p.date)}</p>
            </div>
            <p className="text-xs text-muted-foreground tabular-nums text-right">
              {p.dayProtein != null ? `${p.dayProtein}g protein` : 'no food logged'}
              {p.prevDayProtein != null && <><br />{p.prevDayProtein}g day before</>}
            </p>
          </li>
        ))}
      </ul>
    </InsightCard>
  );
}
