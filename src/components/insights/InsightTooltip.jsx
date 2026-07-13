'use client';

import React from 'react';

// Shared Recharts tooltip: rounded, borderless, unit-formatted.
export default function InsightTooltip({ active, payload, label, formatter, labelFormatter }) {
  if (!active || !payload?.length) return null;
  const displayLabel = labelFormatter ? labelFormatter(label, payload) : label;
  return (
    <div className="bg-card rounded-xl shadow-lg px-3 py-2 text-xs" style={{ border: 'none' }}>
      <p className="font-bold text-foreground mb-1">{displayLabel}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-muted-foreground tabular-nums">
          {formatter ? formatter(entry) : `${entry.name}: ${entry.value}`}
        </p>
      ))}
    </div>
  );
}
