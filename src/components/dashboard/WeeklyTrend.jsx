'use client';

import React from 'react';
import { TrendingUp, Dumbbell } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts';
import InsightTooltip from '../insights/InsightTooltip';
import { AXIS_TICK, REF_LINE, SERIES, gridProps } from '../insights/chartTheme';

// Recharts' default chart margin is { top: 5, right: 5, bottom: 5, left: 5 } and the
// YAxis below is `hide`, which excludes it from the offset calculation entirely (recharts
// only reserves axis width for visible left/right axes). So the plot area spans exactly
// [5px, containerWidth - 5px] regardless of viewport width. The default XAxis `padding` is
// { left: 0, right: 0 }, so the category band scale divides that full plot width into
// `rows.length` equal bands with no extra inset. The marker row below mirrors this exactly:
// 5px of horizontal padding (matching the chart margin) plus `rows.length` equal-width
// (`flex-1`) flex children, each centering its own content. That reproduces the same
// per-category band centers Recharts computes internally, so the markers track the bars at
// any width (mobile 375px or desktop) without depending on unstable internal chart hooks.
const PLOT_MARGIN = 5;

export default function WeeklyTrend({ weeklyData, dailyGoal }) {
  const rows = weeklyData.map((d) => ({ ...d, label: d.dayName }));

  // Build sr-only trained sentence
  const trainedDays = rows.filter(r => r.trained).map(r => r.dayName);
  const trainedSentence = trainedDays.length > 0 ? `Trained ${trainedDays.join(', ')}` : 'No training days this week';

  return (
    <div className="bg-card rounded-2xl p-6 border border-border">
      <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-faint" />
        This Week
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={rows}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} />
          <YAxis hide />
          <Tooltip content={<InsightTooltip formatter={(e) => `${e.value} kcal`} />} />
          {dailyGoal > 0 && <ReferenceLine y={dailyGoal} stroke={REF_LINE} strokeDasharray="3 3" />}
          <Bar dataKey="calories" name="Calories" radius={[6, 6, 0, 0]} maxBarSize={28} isAnimationActive={false}>
            {rows.map((r) => (
              <Cell key={r.label + r.date} fill={r.calories > 0 ? SERIES.weeklyBars : SERIES.weeklyBarsEmpty} fillOpacity={1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex mt-1" style={{ paddingLeft: PLOT_MARGIN, paddingRight: PLOT_MARGIN }} aria-hidden="true">
        {rows.map((r) => (
          <span key={r.label + r.date} className="flex-1 flex justify-center">
            {r.trained ? <Dumbbell className="w-3 h-3 text-training-text" /> : <span className="w-3 h-3" />}
          </span>
        ))}
      </div>
      <span className="sr-only">{trainedSentence}</span>
    </div>
  );
}
