# Settings, Units & Landing-Bundle Diet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a kg/lb weight-unit preference applied end-to-end, rebuild Settings as a real screen (with a hydration-goal preference), and cut supabase+framer from the landing route's initial bundle.

**Architecture:** Every stored weight stays canonical lb; a new pure `src/lib/units.js` converts only at input/display boundaries, driven by `weightUnit` from `useApp()` and threaded to screens through the existing thin route pages. Settings preferences persist through the existing `/api/user/settings` POST → refetch pattern. The landing diet swaps static supabase/framer imports for dynamic imports + LazyMotion.

**Tech Stack:** Next.js 15 App Router, React 19, Supabase (CLI-linked migrations), Framer Motion 12 (`LazyMotion`/`m`), Jest 30, Tailwind 4 tokens.

**Spec:** `docs/superpowers/specs/2026-07-13-settings-units-bundle-design.md`

## Global Constraints

- Canonical storage unit for ALL weights (sets, PRs, body weight) is **lb**. Conversion happens ONLY through `src/lib/units.js` helpers at input/display boundaries. Never convert inside state, caches, or API payload builders except via `toLb` at a save boundary.
- kg display rounds to **1 decimal**; volume displays round to **whole numbers**; values written to storage round to **4 decimals** (`toLb` does this internally).
- `user_settings.weight_unit` ∈ {`'lb'`, `'kg'`}, default `'lb'`. `user_settings.water_goal` integer, default `8`, clamped to **4–16** on both server and UI.
- Plate-math constants verbatim: `BARS = { lb: 45, kg: 20 }`; `PLATES.lb = [45, 35, 25, 10, 5, 2.5]`; `PLATES.kg = [25, 20, 15, 10, 5, 2.5, 1.25]`; PlateCalculator bar toggle options: lb `[45, 35, 25, 0]`, kg `[20, 15, 10, 0]`.
- Unit words in copy: lowercase `lb` / `kg` everywhere, except the WorkoutCard set-grid column header which title-cases (`Lb` / `Kg`). Replaces the current mixed `lbs`/`Lbs`.
- Landing changes must produce **no visual or motion change**; reduced-motion behavior preserved. `/` first-load target ≤ ~120kB — record actuals honestly if missed.
- 44px touch-target floor; existing semantic tokens only (eslint warns on raw indigo/slate); no new dependencies.
- Every task ends with the full Jest suite green (`npx jest`) and a clean `npm run build`, then a commit.
- Repo root: `/Users/edwinzeledon/Documents/GitHub/snapcal`, branch `dark-athletic-redesign`.

---

### Task 1: `src/lib/units.js` — conversion + plate constants (TDD)

**Files:**
- Create: `src/lib/units.js`
- Test: `src/lib/__tests__/units.test.js`

**Interfaces:**
- Produces (later tasks import these exact names from `@/lib/units`):
  - `LB_PER_KG: number` (2.2046226218)
  - `BARS: { lb: 45, kg: 20 }`
  - `PLATES: { lb: number[], kg: number[] }`
  - `toDisplay(lb, unit) => number` — lb→display units; kg rounds to 1 decimal
  - `toLb(value, unit) => number` — display→lb, rounded to 4 decimals
  - `toDisplayVolume(lb, unit) => number` — whole-number volume conversion
  - `formatWeight(lb, unit) => string` — e.g. `"225 lb"`, `"102.5 kg"`
  - All numeric helpers return `0` for blank/invalid input.

- [ ] **Step 1: Write the failing test**

```js
// src/lib/__tests__/units.test.js
import { LB_PER_KG, BARS, PLATES, toDisplay, toLb, toDisplayVolume, formatWeight } from '../units';

describe('units', () => {
  test('lb passthrough both directions', () => {
    expect(toDisplay(225, 'lb')).toBe(225);
    expect(toLb('225', 'lb')).toBe(225);
  });

  test('kg display rounds to 1 decimal', () => {
    expect(toDisplay(225, 'kg')).toBe(102.1); // 225 / 2.2046226218 = 102.058…
  });

  test('kg entry converts to lb rounded to 4 decimals', () => {
    expect(toLb(100, 'kg')).toBe(220.4623);
  });

  test('round-trip is stable at kg precision', () => {
    expect(toDisplay(toLb('102.5', 'kg'), 'kg')).toBe(102.5);
  });

  test('blank or invalid input maps to 0', () => {
    expect(toLb('', 'kg')).toBe(0);
    expect(toDisplay(undefined, 'lb')).toBe(0);
    expect(toDisplay('-', 'kg')).toBe(0);
  });

  test('volume converts to whole numbers', () => {
    expect(toDisplayVolume(12500, 'lb')).toBe(12500);
    expect(toDisplayVolume(12500, 'kg')).toBe(5670); // 12500 / 2.2046226218 = 5669.99…
  });

  test('formatWeight uses lowercase unit words', () => {
    expect(formatWeight(225, 'lb')).toBe('225 lb');
    expect(formatWeight(225.9738, 'kg')).toBe('102.5 kg');
  });

  test('bar and plate constants are exact', () => {
    expect(LB_PER_KG).toBe(2.2046226218);
    expect(BARS).toEqual({ lb: 45, kg: 20 });
    expect(PLATES.lb).toEqual([45, 35, 25, 10, 5, 2.5]);
    expect(PLATES.kg).toEqual([25, 20, 15, 10, 5, 2.5, 1.25]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/__tests__/units.test.js`
Expected: FAIL — "Cannot find module '../units'"

- [ ] **Step 3: Write the implementation**

```js
// src/lib/units.js
// Canonical storage unit for every weight in the app (sets, PRs, body weight)
// is POUNDS. These helpers are the only sanctioned conversion boundary:
// convert to the user's display unit on the way out, back to lb on the way in.
export const LB_PER_KG = 2.2046226218;

export const BARS = { lb: 45, kg: 20 };
export const PLATES = {
  lb: [45, 35, 25, 10, 5, 2.5],
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
};

const round1 = (n) => Math.round(n * 10) / 10;
const round4 = (n) => Math.round(n * 10000) / 10000;

export function toDisplay(lb, unit) {
  const n = parseFloat(lb);
  if (!Number.isFinite(n)) return 0;
  return unit === 'kg' ? round1(n / LB_PER_KG) : round4(n);
}

export function toLb(value, unit) {
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return 0;
  return unit === 'kg' ? round4(n * LB_PER_KG) : round4(n);
}

export function toDisplayVolume(lb, unit) {
  const n = parseFloat(lb);
  if (!Number.isFinite(n)) return 0;
  return Math.round(unit === 'kg' ? n / LB_PER_KG : n);
}

export function formatWeight(lb, unit) {
  return `${toDisplay(lb, unit)} ${unit === 'kg' ? 'kg' : 'lb'}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/lib/__tests__/units.test.js`
Expected: PASS (8 tests)

- [ ] **Step 5: Full suite + build, then commit**

Run: `npx jest && npm run build`
Expected: all suites pass, build clean.

```bash
git add src/lib/units.js src/lib/__tests__/units.test.js
git commit -m "feat(units): canonical-lb conversion lib with plate constants"
```

---

### Task 2: Preference plumbing — migration, API passthrough, AppProvider

**Files:**
- Create: `supabase/migrations/20260713000001_weight_unit_water_goal.sql`
- Modify: `src/app/api/user/settings/route.js` (POST, just before the upsert)
- Modify: `src/components/app/AppProvider.jsx`

**Interfaces:**
- Consumes: nothing from Task 1 (independent).
- Produces:
  - DB columns `user_settings.weight_unit` (text, default `'lb'`) and `user_settings.water_goal` (integer, default `8`).
  - Settings POST accepts `{ weightUnit: 'lb'|'kg'|'lbs' }` (maps `'lbs'`→`'lb'`) and `{ waterGoal: number }` (server-clamped 4–16) — in BOTH the profile branch and the manual branch.
  - `useApp()` additionally returns `weightUnit: 'lb'|'kg'`, `waterGoal: number`, and `handleUpdatePreferences(updates) => Promise<boolean>` (saves, refetches, returns false on failure).

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260713000001_weight_unit_water_goal.sql
alter table public.user_settings
  add column if not exists weight_unit text not null default 'lb',
  add column if not exists water_goal integer not null default 8;

alter table public.user_settings
  drop constraint if exists user_settings_weight_unit_check;

alter table public.user_settings
  add constraint user_settings_weight_unit_check check (weight_unit in ('lb', 'kg'));
```

- [ ] **Step 2: Apply it**

Run: `supabase db push` (CLI is already linked to the project)
Expected: migration `20260713000001` applied. If the CLI errors (auth/link), STOP and report BLOCKED — do not hand-run SQL elsewhere.

- [ ] **Step 3: API passthrough**

In `src/app/api/user/settings/route.js`, the POST builds `updates` in an `if (body.age && body.weight && body.height) { … } else { … }` block and then upserts. Insert between the closing `}` of that if/else and the `const { data, error } = await supabase` upsert:

```js
  // Preference passthroughs — outside the if/else so they apply in both
  // branches (onboarding carries weightUnit alongside profile data; the
  // Settings screen sends preferences alone).
  if (body.weightUnit) updates.weight_unit = body.weightUnit === 'kg' ? 'kg' : 'lb';
  if (body.waterGoal !== undefined) {
    updates.water_goal = Math.min(16, Math.max(4, parseInt(body.waterGoal) || 8));
  }
```

Note: `OnboardingForm` already spreads `...formData` into its submit payload, so `weightUnit: 'lbs'|'kg'` reaches this POST today — the `'lbs'`→`'lb'` mapping above IS the onboarding seeding. No OnboardingForm change needed.

- [ ] **Step 4: AppProvider state + exposure**

In `src/components/app/AppProvider.jsx`:

a) Add state next to the other settings-derived state (near `const [dailyGoal, setDailyGoal] = …`):

```js
  const [weightUnit, setWeightUnit] = useState('lb');
  const [waterGoal, setWaterGoal] = useState(8);
```

b) In `fetchData`, inside the `if (settings) {` block, directly after `if (settings.daily_goal) setDailyGoal(settings.daily_goal);`:

```js
        setWeightUnit(settings.weight_unit === 'kg' ? 'kg' : 'lb');
        setWaterGoal(settings.water_goal || 8);
```

c) In the localStorage cache-hydrate path (the block that parses `snapcal_settings` and calls `setDailyGoal` from `settings.daily_goal`), add the same two lines after the `setDailyGoal` call there.

d) Add the handler next to `handleUpdateGoal`:

```js
  const handleUpdatePreferences = async (updates) => {
    if (!user) return false;
    try {
      await updateUserSettings(user.id, updates);
      await fetchData();
      return true;
    } catch (e) {
      console.error('Error saving preference', e);
      return false;
    }
  };
```

e) Add to the `value` object (Raw state section): `weightUnit,` `waterGoal,` — and (Handlers section): `handleUpdatePreferences,`.

- [ ] **Step 5: Suite + build, commit**

Run: `npx jest && npm run build`
Expected: green, clean.

```bash
git add supabase/migrations/20260713000001_weight_unit_water_goal.sql src/app/api/user/settings/route.js src/components/app/AppProvider.jsx
git commit -m "feat(units): weight_unit + water_goal columns, API passthrough, useApp exposure"
```

---

### Task 3: Workout surfaces — WorkoutCard inputs + PlateCalculator

**Files:**
- Modify: `src/components/workout/WorkoutCard.jsx`
- Modify: `src/components/workout/PlateCalculator.jsx` (full rewrite of unit-bearing parts)
- Modify: `src/components/workout/WorkoutView.jsx` (prop thread + summary volume)
- Modify: `src/app/(app)/train/page.jsx`

**Interfaces:**
- Consumes: `toDisplay`, `toLb`, `toDisplayVolume`, `BARS`, `PLATES` from `@/lib/units` (Task 1); `app.weightUnit` from `useApp()` (Task 2).
- Produces: `WorkoutCard({ log, onDelete, onUpdate, weightUnit = 'lb' })`; `PlateCalculator({ isOpen, onClose, onApply, unit = 'lb' })` where `onApply` receives a **display-unit** total; `WorkoutView({ user, onWorkoutComplete, initialLogs, onUpdateLogs, weightUnit = 'lb' })`.

**Design constraint (read first):** WorkoutView's `workoutLogs` state is lifted app state (`app.activeWorkoutLogs`) that is refetched from the DB, cached to localStorage, pruned/PUT by `submitWorkout`, and seeded from lb-domain history caches. It must stay **lb** end-to-end. Do NOT convert sets in any state, effect, or save path. The ONLY conversions in this task are: (1) inside the new `WeightInput` render boundary, (2) `handleApplyWeight` converting the plate-calculator's display-unit total to lb, (3) the summary modal's volume readout.

- [ ] **Step 1: `WeightInput` in WorkoutCard.jsx**

Add import: `import { toDisplay, toLb } from '@/lib/units';`

Add this module-level component above `export default function WorkoutCard`:

```jsx
// Controlled lb-state input that edits in the user's display unit. While
// focused, the raw draft string is shown so typing "102.5" isn't fought by
// round-trip rounding; state (and storage) stay canonical lb.
function WeightInput({ valueLb, unit, onCommit, onFocus, onBlur, className }) {
  const [draft, setDraft] = useState(null);
  const settled = valueLb === '' || valueLb == null ? '' : String(toDisplay(valueLb, unit));
  return (
    <input
      type="number"
      inputMode="decimal"
      min="0"
      placeholder="-"
      value={draft !== null ? draft : settled}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        onCommit(raw === '' ? '' : String(toLb(raw, unit)));
      }}
      onFocus={(e) => { setDraft(settled); if (onFocus) onFocus(e); }}
      onBlur={(e) => { setDraft(null); if (onBlur) onBlur(e); }}
      className={className}
    />
  );
}
```

- [ ] **Step 2: Use it for the set weight input**

Signature: `export default function WorkoutCard({ log, onDelete, onUpdate, weightUnit = 'lb' })`.

Replace the weight `<input …>` inside the sets map (the one with `value={set.weight}` and `onChange={e => updateSet(idx, 'weight', e.target.value)}`) with:

```jsx
<WeightInput
  valueLb={set.weight}
  unit={weightUnit}
  onCommit={(lbStr) => updateSet(idx, 'weight', lbStr)}
  onFocus={handleFocus}
  onBlur={handleBlur}
  className={`w-full text-center py-2 border rounded-lg outline-none font-bold text-base sm:text-sm transition-all ${isPR
    ? 'bg-streak-soft border-streak-soft-border focus:border-streak'
    : set.completed
      ? 'bg-protein-soft border-protein-soft text-protein-text focus:border-protein-text'
      : 'bg-muted border-border text-foreground focus:border-ring focus:ring-2 focus:ring-ring'
    }`}
/>
```

(The className is verbatim what the old input used. The reps input is untouched.)

- [ ] **Step 3: Column header + plate-calc apply**

Grid header: `<div className="col-span-3">Lbs</div>` → `<div className="col-span-3">{weightUnit === 'kg' ? 'Kg' : 'Lbs'}</div>`.

In `handleApplyWeight(weight)` — the argument is now a display-unit total from PlateCalculator. First line of the function: `const lbStr = String(toLb(weight, weightUnit));` then replace both uses of the raw value (`{ ...set, weight: weight }` and `[{ weight: weight, reps: '', completed: false }]`) with `lbStr`.

PlateCalculator render gains `unit={weightUnit}`.

`isNewRecord`, PR confetti, `performSave`, `updateParent`, best-set logic: NO changes — all already lb-vs-lb.

- [ ] **Step 4: PlateCalculator goes unit-aware**

In `src/components/workout/PlateCalculator.jsx`:

```jsx
import { BARS, PLATES } from '@/lib/units';

const BAR_OPTIONS = { lb: [45, 35, 25, 0], kg: [20, 15, 10, 0] };
const emptyRack = (unit) => Object.fromEntries(PLATES[unit].map((p) => [p, 0]));

export default function PlateCalculator({ isOpen, onClose, onApply, unit = 'lb' }) {
  const { closeRef } = useModalBehavior(isOpen, onClose);
  const [barWeight, setBarWeight] = useState(BARS[unit]);
  const [plates, setPlates] = useState(() => emptyRack(unit));
```

Then replace every hardcoded literal:
- `reset()` → `setPlates(emptyRack(unit));`
- Total display `lbs` suffix → `{unit === 'kg' ? 'kg' : 'lb'}`.
- Bar toggle `{[45, 35, 25, 0].map(w => …)}` → `{BAR_OPTIONS[unit].map(w => …)}` and its button label `{w} lbs` → `{w} {unit === 'kg' ? 'kg' : 'lb'}`.
- Plates grid `{[45, 35, 25, 10, 5, 2.5].map(weight => …)}` → `{PLATES[unit].map(weight => …)}` and the per-plate `lbs` sublabel → `{unit === 'kg' ? 'kg' : 'lb'}`.

`calculateTotal()` and `onApply(calculateTotal())` are unchanged — the total is in the active display unit by construction, and WorkoutCard now converts it (Step 3). The component is key-remounted by its `isOpen` gate, so `useState(BARS[unit])` initializers are safe; a unit change only ever happens on the Settings screen.

- [ ] **Step 5: Thread the prop + summary volume**

`WorkoutView.jsx`:
- Signature: `export default function WorkoutView({ user, onWorkoutComplete, initialLogs = [], onUpdateLogs, weightUnit = 'lb' })`.
- Add `import { toDisplayVolume } from '@/lib/units';`
- The `<WorkoutCard key={log.id} log={log} onDelete={deleteWorkout} onUpdate={handleUpdateLog} />` render gains `weightUnit={weightUnit}`.
- Summary modal volume readout `{(summaryData.volume || 0).toLocaleString()}` → `{toDisplayVolume(summaryData.volume || 0, weightUnit).toLocaleString()}`. If the stat has a static unit sublabel nearby, make it `{weightUnit === 'kg' ? 'kg' : 'lb'}`; if it's unlabeled, leave it unlabeled.
- `submitWorkout`, history seeding, template flows: NO changes (lb domain).

`src/app/(app)/train/page.jsx`: add `weightUnit={app.weightUnit}` to the `<WorkoutView …>` props.

- [ ] **Step 6: Suite + build, commit**

Run: `npx jest && npm run build`
Expected: green, clean.

```bash
git add src/components/workout/WorkoutCard.jsx src/components/workout/PlateCalculator.jsx src/components/workout/WorkoutView.jsx "src/app/(app)/train/page.jsx"
git commit -m "feat(units): unit-aware set inputs, plate calculator, session volume"
```

---

### Task 4: Insights + History surfaces

**Files:**
- Modify: `src/components/insights/InsightsView.jsx` (signature, WeightEntry, card props)
- Modify: `src/components/insights/VolumeProteinCard.jsx`
- Modify: `src/components/insights/WeightBalanceCard.jsx`
- Modify: `src/components/insights/PrTimelineCard.jsx`
- Modify: `src/components/HistoryView.jsx`
- Modify: `src/app/(app)/insights/page.jsx`, `src/app/(app)/history/page.jsx`

**Interfaces:**
- Consumes: `toDisplay`, `toLb`, `toDisplayVolume`, `formatWeight` from `@/lib/units`; `app.weightUnit` (Task 2).
- Produces: `InsightsView({ user, onGoLogProtein, weightUnit = 'lb' })`; `HistoryView` gains `weightUnit = 'lb'`; the three insight cards gain `unit = 'lb'`. `src/lib/insights.js` output stays lb — cards convert at render.

- [ ] **Step 1: InsightsView + WeightEntry**

- Signature: `export default function InsightsView({ user, onGoLogProtein, weightUnit = 'lb' })`. Add `import { toLb } from '@/lib/units';` at the top of the file.
- `WeightEntry` (same file) gains a `weightUnit = 'lb'` prop; `<WeightEntry user={user} onSaved={…} />` gains `weightUnit={weightUnit}`.
- In `WeightEntry.handleSave`, change `weight: weightVal,` → `weight: toLb(weightVal, weightUnit),` (body weight is canonical lb like everything else).
- The weight input's `placeholder="0.0"` → `placeholder={weightUnit === 'kg' ? 'kg' : 'lb'}`.
- Card renders gain the unit: `<VolumeProteinCard data={data} unit={weightUnit} />`, `<WeightBalanceCard data={data} unit={weightUnit} />`, `<PrTimelineCard data={data} unit={weightUnit} />` (match the actual prop lists in place — only ADD `unit`).

- [ ] **Step 2: VolumeProteinCard**

```jsx
import { toDisplayVolume } from '@/lib/units';

export default function VolumeProteinCard({ data, unit = 'lb' }) {
  const rows = (data.weeks || []).map((w) => ({
    ...w,
    volume: toDisplayVolume(w.volume, unit),
    label: fmtWk(w.weekStart),
  }));
```

- Tooltip formatter: `` `Volume: ${e.value.toLocaleString()} lb` `` → `` `Volume: ${e.value.toLocaleString()} ${unit}` ``.
- Legend: `Weekly volume (lb)` → `` {`Weekly volume (${unit})`} ``.
- The empty-state check (`r.volume > 0`) works unchanged on converted rows.

- [ ] **Step 3: WeightBalanceCard**

```jsx
import { toDisplay } from '@/lib/units';

export default function WeightBalanceCard({ data, unit = 'lb' }) {
  const rows = (data.weightSeries || []).map((r) => ({ ...r, weight: toDisplay(r.weight, unit) }));
```

- Tooltip: `` `Weight: ${e.value} lb` `` → `` `Weight: ${e.value} ${unit}` ``.
- The Y-axis `domain={['dataMin - 2', 'dataMax + 2']}` stays — converted values feed it, so axes match tooltips.

- [ ] **Step 4: PrTimelineCard + HistoryView**

- `PrTimelineCard({ data, unit = 'lb' })` + `import { toDisplay } from '@/lib/units';`. The PR list line `{p.weight}×{p.reps}` → `{toDisplay(p.weight, unit)}×{p.reps}`. Sweep the rest of the file for any other rendered `weight` or `lb` string (tooltips included) and convert the same way.
- `HistoryView`: add `weightUnit = 'lb'` to the props destructuring and `import { formatWeight } from '@/lib/units';`. Best-set line: `` {bestSet ? `${bestSet.weight}lbs × ${bestSet.reps}` : '-'} `` → `` {bestSet ? `${formatWeight(bestSet.weight, weightUnit)} × ${bestSet.reps}` : '-'} ``.

- [ ] **Step 5: Thin pages + straggler grep**

- `src/app/(app)/insights/page.jsx`: `<InsightsView user={app.user} onGoLogProtein={…} weightUnit={app.weightUnit} />`.
- `src/app/(app)/history/page.jsx`: add `weightUnit={app.weightUnit}` to the `<HistoryView …>` props.
- Straggler check: `grep -rn "lbs\|\blb\b" src/components --include="*.jsx" | grep -v "landing-page\|OnboardingForm\|units"` — expected hits after this task: none. (`OnboardingForm` legitimately keeps its own lbs/kg picker copy; `src/lib/prompts.js` is AI-prompt text, out of scope.)

- [ ] **Step 6: Suite + build, commit**

Run: `npx jest && npm run build`
Expected: green, clean.

```bash
git add src/components/insights/InsightsView.jsx src/components/insights/VolumeProteinCard.jsx src/components/insights/WeightBalanceCard.jsx src/components/insights/PrTimelineCard.jsx src/components/HistoryView.jsx "src/app/(app)/insights/page.jsx" "src/app/(app)/history/page.jsx"
git commit -m "feat(units): unit-aware insights charts, history, body-weight entry"
```

---

### Task 5: Settings screen (core four) + hydration goal wiring

**Files:**
- Rewrite: `src/components/SettingsView.jsx`
- Modify: `src/components/dashboard/HydrationTracker.jsx`
- Modify: `src/components/Dashboard.jsx`
- Modify: `src/app/(app)/today/page.jsx`

**Interfaces:**
- Consumes: `useApp()` → `user`, `dailyGoal`, `macroGoals`, `weightUnit`, `waterGoal`, `handleUpdatePreferences`, `handleLogout`, `showToast` (Task 2). `SegmentedControl({ options, value, onChange })` from `src/components/ui/SegmentedControl.jsx`.
- Produces: `SettingsView({ onRetakeAssessment })` (same external contract — `(app)/settings/page.jsx` needs NO changes); `HydrationTracker({ waterIntake, goal = 8, onUpdateWater })`.

- [ ] **Step 1: Rewrite SettingsView**

Replace `src/components/SettingsView.jsx` entirely:

```jsx
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

export default function SettingsView({ onRetakeAssessment }) {
  const {
    user, dailyGoal, macroGoals, weightUnit, waterGoal,
    handleUpdatePreferences, handleLogout, showToast,
  } = useApp();
  const [saving, setSaving] = useState(false);

  const savePreference = async (updates) => {
    if (saving) return;
    setSaving(true);
    const ok = await handleUpdatePreferences(updates);
    if (!ok) showToast({ message: "Couldn't save preference", variant: 'error' });
    setSaving(false);
  };

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
```

Notes: preferences are NOT optimistic — the control renders the context value, which updates after `handleUpdatePreferences`'s refetch, so a failed save "reverts" for free (the value never moved) and the failure toast explains why. `(app)/settings/page.jsx` keeps passing only `onRetakeAssessment` — unchanged.

- [ ] **Step 2: HydrationTracker goal prop**

In `src/components/dashboard/HydrationTracker.jsx`:
- Signature: `export default function HydrationTracker({ waterIntake = 0, goal = 8, onUpdateWater })`.
- `{[...Array(8)].map((_, i) => (` → `{[...Array(goal)].map((_, i) => (`.
- Copy: `{waterIntake} / 8 Glasses` → `{waterIntake} / {goal} Glasses`.
(Existing behavior when intake > goal: all droplets render filled since `i < waterIntake` — acceptable per spec.)

- [ ] **Step 3: Thread through Dashboard**

- `src/components/Dashboard.jsx`: add `waterGoal = 8` to the props destructuring; `<HydrationTracker waterIntake={dailyStats.water_intake} onUpdateWater={handleUpdateWater} />` gains `goal={waterGoal}`.
- `src/app/(app)/today/page.jsx`: add `waterGoal={app.waterGoal}` to the `<Dashboard …>` props.

- [ ] **Step 4: Suite + build, commit**

Run: `npx jest && npm run build`
Expected: green, clean.

```bash
git add src/components/SettingsView.jsx src/components/dashboard/HydrationTracker.jsx src/components/Dashboard.jsx "src/app/(app)/today/page.jsx"
git commit -m "feat(settings): real settings screen with unit + hydration preferences"
```

---

### Task 6: Landing-bundle diet — dynamic supabase, dynamic AuthView, LazyMotion

**Files:**
- Modify: `src/app/page.jsx`
- Modify: `src/components/landing-page/LandingPage.jsx`
- Create: `src/components/landing-page/motionFeatures.js`
- Modify: `src/components/landing-page/{HeroContent,PhotoBackdrop,sections,AuthView}.jsx` (motion → m)

**Interfaces:**
- Consumes: nothing from earlier tasks (independent).
- Produces: no API changes — behavior-identical landing with supabase-js and the framer animation runtime out of the `/` route's initial chunks.

**Hard rule:** zero visual or motion change. Every animation prop, variant, transition, and reduced-motion guard stays byte-identical — only the import mechanism changes.

- [ ] **Step 1: Record the BEFORE bundle table**

Run: `npm run build` and save the route table (at minimum the `/` row: First Load JS). Keep it for the Task 7 report.

- [ ] **Step 2: Root page — dynamic supabase**

In `src/app/page.jsx`: delete `import { supabase } from '@/lib/supabaseClient';` and replace the effect body:

```jsx
  useEffect(() => {
    let cancelled = false;
    // Dynamic import keeps supabase-js out of the landing route's initial
    // bundle; the session check pays one extra async hop, nothing visible.
    import('@/lib/supabaseClient').then(({ supabase }) =>
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (cancelled) return;
        if (session?.user) {
          router.replace('/today');
        } else {
          setChecking(false);
        }
      })
    );
    return () => { cancelled = true; };
  }, [router]);
```

- [ ] **Step 3: LandingPage — dynamic AuthView + dynamic supabase listener + LazyMotion**

In `src/components/landing-page/LandingPage.jsx`:

a) Imports: remove `import { AnimatePresence, motion } from 'framer-motion';` and `import { supabase } from '@/lib/supabaseClient';` and `import AuthView from './AuthView';`. Add:

```jsx
import dynamicImport from 'next/dynamic';
import { AnimatePresence, LazyMotion, m } from 'framer-motion';

const AuthView = dynamicImport(() => import('./AuthView'), { ssr: false, loading: () => null });
const loadFeatures = () => import('./motionFeatures').then((mod) => mod.default);
```

(`loading: () => null` is the lightweight loading state — the photo backdrop stays visible for the beat before AuthView's own entry animation runs.)

b) Auth-transition effect — same logic, supabase loaded on demand (keep the existing explanatory comment block above it):

```jsx
  useEffect(() => {
    let subscription;
    let cancelled = false;
    import('@/lib/supabaseClient').then(({ supabase }) => {
      if (cancelled) return;
      ({ data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          router.replace(validateNext(nextRef.current) || '/today');
        }
      }));
    });
    return () => { cancelled = true; subscription?.unsubscribe(); };
  }, [router]);
```

c) Wrap the returned tree in LazyMotion — first element inside the return:

```jsx
  return (
    <LazyMotion features={loadFeatures} strict>
      <div className={`bg-background text-foreground ${showAuth ? 'h-dvh overflow-hidden' : 'min-h-screen'}`}>
        …existing content unchanged…
      </div>
    </LazyMotion>
  );
```

d) `<motion.div key="hero" …>` → `<m.div key="hero" …>` (closing tag too).

- [ ] **Step 4: Features file + m-migration of the other four**

Create `src/components/landing-page/motionFeatures.js`:

```js
// Loaded lazily by LandingPage's <LazyMotion> so the framer animation
// runtime stays out of the landing route's initial bundle.
import { domAnimation } from 'framer-motion';
export default domAnimation;
```

In each of `HeroContent.jsx`, `PhotoBackdrop.jsx`, `sections.jsx`, `AuthView.jsx`: change `import { motion, useReducedMotion } from 'framer-motion';` → `import { m, useReducedMotion } from 'framer-motion';` and mechanically replace every `motion.` with `m.` (JSX open AND close tags). No other edits — props/variants byte-identical. (`strict` mode on LazyMotion will throw at runtime if any `motion.` survives — that's the enforcement.)

- [ ] **Step 5: AFTER bundle table + behavior pass**

- `npm run build` — record the new route table. Compare `/` First Load JS against Step 1 and the ≤ ~120kB target; if missed, note the remaining heavy chunks (`.next/build` output names them) honestly.
- `npm run start` then manually: landing loads with identical hero motion; Sign In opens AuthView (watch for a broken beat — none expected); `/?auth=1` deep link opens auth on load; sign-in redirects to `/today`; reduced-motion (OS setting or devtools emulation) still suppresses entry motion.

- [ ] **Step 6: Suite + build, commit**

Run: `npx jest && npm run build`
Expected: green, clean.

```bash
git add src/app/page.jsx src/components/landing-page/
git commit -m "perf(landing): dynamic supabase + AuthView, LazyMotion — shrink / first-load"
```

---

### Task 7: Verification pass + report

**Files:**
- Create: `docs/superpowers/reviews/2026-07-13-settings-units-bundle-verification.md`

**Interfaces:**
- Consumes: everything above; the spec's §8 checklist.

- [ ] **Step 1: Automated gates**

- `npx jest` — record total (expect prior 50 + 8 units tests = 58, all green).
- `npm run build` — record the full per-route First Load JS table (before/after for `/` using Task 6's Step 1 numbers).

- [ ] **Step 2: Lighthouse on `/`**

Run against `npm run start` (production build): `npx lighthouse http://localhost:3000/ --only-categories=performance,accessibility --preset=desktop --quiet --chrome-flags="--headless"`. Record performance score, LCP, and a11y (must hold 100). Compare LCP to the ledger's 3.3s baseline.

- [ ] **Step 3: Manual kg-user loop (dev server + dev Supabase)**

Work through the spec §8 list and record pass/fail per line:
1. Settings → unit toggle to kg persists across refresh (check `user_settings.weight_unit` via the app behavior, not SQL).
2. Train: enter a set in kg; refresh; value redisplays identically (round-trip); complete it; PR logic behaves (no phantom PR on an old lb-era best).
3. PlateCalculator shows 20 kg bar + kg plate set; applied total lands in the set input as the same kg number.
4. Insights: volume chart and legend in kg; weight chart in kg; body-weight entry placeholder "kg", saved value re-renders correctly.
5. History best-set line shows kg.
6. Toggle back to lb in Settings — all historical rows re-render in lb correctly both ways.
7. Hydration: set goal to 10 in Settings → Today shows 10 droplets and "N / 10 Glasses".
8. Settings failure path: with the dev server's network offline (devtools), flip the unit — error toast appears, control stays on the old value.
9. Sign out from Settings lands on `/`.
10. Landing: `?auth=1&next=/train` → sign in → lands on `/train` (dynamic AuthView didn't break the next-param flow).

- [ ] **Step 4: Write the report + ledger, commit**

Write findings (tables + pass/fail list + bundle before/after + Lighthouse numbers) to `docs/superpowers/reviews/2026-07-13-settings-units-bundle-verification.md`.

```bash
git add docs/superpowers/reviews/2026-07-13-settings-units-bundle-verification.md
git commit -m "chore(verify): settings/units/bundle wave verification report"
```
