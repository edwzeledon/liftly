import React from 'react';

// Static, decorative miniature of the Today hero. Fixed sample values only —
// this is NOT wired to real data (the live dashboard components fetch from
// the API and carry state; this component intentionally has neither).
const RING_OUTER = { r: 42, w: 9, pct: 0.74 }; // protein
const RING_INNER = { r: 31, w: 5, pct: 0.82 }; // calories
const circumference = (r) => 2 * Math.PI * r;

export default function DeviceFrame() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none select-none scale-90 md:scale-100"
    >
      <div className="w-[200px] rounded-[2.5rem] border-4 border-border bg-background p-4">
        <div className="bg-card rounded-[1.75rem] p-4">
          {/* Ring */}
          <div className="relative w-32 h-32 mx-auto">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r={RING_OUTER.r} fill="none" strokeWidth={RING_OUTER.w} className="stroke-muted" />
              <circle
                cx="50" cy="50" r={RING_OUTER.r} fill="none" strokeWidth={RING_OUTER.w} strokeLinecap="round"
                stroke="var(--color-protein)"
                strokeDasharray={circumference(RING_OUTER.r)}
                strokeDashoffset={circumference(RING_OUTER.r) * (1 - RING_OUTER.pct)}
              />
              <circle cx="50" cy="50" r={RING_INNER.r} fill="none" strokeWidth={RING_INNER.w} className="stroke-muted" />
              <circle
                cx="50" cy="50" r={RING_INNER.r} fill="none" strokeWidth={RING_INNER.w} strokeLinecap="round"
                stroke="var(--color-ring-calorie)"
                strokeDasharray={circumference(RING_INNER.r)}
                strokeDashoffset={circumference(RING_INNER.r) * (1 - RING_INNER.pct)}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-3xl font-black text-foreground tabular-nums leading-none">118</span>
              <span className="text-[9px] font-semibold text-protein-text tabular-nums">/ 160g</span>
            </div>
          </div>

          {/* Macro bars */}
          <div className="mt-4 space-y-2">
            <div>
              <div className="flex justify-between text-[9px] font-semibold text-muted-foreground mb-1">
                <span>Carbs</span>
                <span className="tabular-nums">112 / 190g</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-carb" style={{ width: '58%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[9px] font-semibold text-muted-foreground mb-1">
                <span>Fats</span>
                <span className="tabular-nums">26 / 65g</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-fat" style={{ width: '40%' }} />
              </div>
            </div>
          </div>

          {/* Chips */}
          <div className="mt-4 space-y-1.5">
            <div className="text-[9px] font-medium bg-muted text-muted-foreground px-2.5 py-1.5 rounded-full truncate">
              Chicken breast 31g
            </div>
            <div className="text-[9px] font-medium bg-muted text-muted-foreground px-2.5 py-1.5 rounded-full truncate">
              Shake 25g
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
