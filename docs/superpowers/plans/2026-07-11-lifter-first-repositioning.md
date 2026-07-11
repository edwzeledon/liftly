# Lifter-First Repositioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposition Liftly from "calorie tracker with a workout tab" to a lifter-first app: protein-first quick logging, training-day-aware calorie targets, a Training × Nutrition Insights tab, and a weekly cross-domain AI review.

**Architecture:** All data flows stay on the existing pattern — client components in `src/components/`, fetch wrappers in `src/lib/api.js`, Next.js API routes in `src/app/api/*` with per-route Supabase auth, RLS-protected tables. New pure logic (volume, PRs, streaks, insights aggregation) goes in `src/lib/` as testable functions; API routes stay thin.

**Tech Stack:** Next.js 15 (App Router, JS not TS), React 19, Tailwind 4 (`@theme` tokens), Framer Motion 12, Recharts 3.5, Lucide, Supabase (`@/lib/supabase/server` factory server-side, `@/lib/supabaseClient` client-side), Jest 30.

**Spec:** `docs/superpowers/specs/2026-07-11-lifter-first-repositioning-design.md`

## Global Constraints

- JavaScript only — no TypeScript, match existing JSX style (no semicololon-free style; files use semicolons).
- House card style everywhere: `bg-white rounded-3xl p-6 shadow-sm border border-slate-100`.
- `POST /api/logs` request/response contract unchanged (quick-protein entries are ordinary logs with `method: 'quick-protein'`).
- Protein color: emerald-500 `#10b981` (`--color-protein`); emerald-600 `#059669` for small text. Training/brand: indigo-600. Deficit/surplus chart pair: blue-400 / orange-400 (never green/red).
- Display font: Barlow Condensed 600/700 via `next/font`, numerals + section headers ONLY; body stays default sans. `tabular-nums` on every metric.
- Charts: no visible dual y-axes; max 2 series per chart distinguished by mark type, not hue; dashed `#f1f5f9` grid, `axisLine={false} tickLine={false}`; respect `prefers-reduced-motion`.
- All AI rate limits enforced server-side (client checks are cosmetic only).
- Dates: day-boundary strings are `YYYY-MM-DD` via `toLocaleDateString('en-CA')` (existing convention).
- Tests: `npx jest <path> --watchAll=false`. Test pure lib functions and API logic; skip UI snapshot tests.
- Commit after every task (small commits, conventional prefixes).
- Work on branch `lifter-first-repositioning`.

---

### Task 1: Supabase schema baseline + new columns migration

**Files:**
- Create: `supabase/migrations/00000000000000_baseline.sql`
- Create: `supabase/migrations/20260711000001_lifter_first_columns.sql`

**Interfaces:**
- Produces: `user_settings.training_day_calorie_offset` (int, default 250), `user_settings.rest_day_calorie_offset` (int, default 0), `user_settings.last_weekly_review` (date, nullable), `user_settings.weekly_review_content` (jsonb, nullable). Later tasks (8, 13) read/write these.

- [ ] **Step 1: Export the current schema as a baseline**

The hosted DB is the only source of truth today (`supabase/migrations/` is empty). If the Supabase CLI is linked, run:

```bash
npx supabase db dump --schema public -f supabase/migrations/00000000000000_baseline.sql
```

If the CLI is not linked (no `supabase/config.toml` credentials), get the schema from Supabase Studio → Database → Schema Visualizer → export, or run this in the SQL editor and paste the output into the file:

```sql
select
  'create table if not exists ' || tablename || ' (...);' -- Studio's "Definition" tab per table is easier
from pg_tables where schemaname = 'public';
```

Either way the file MUST end up containing `create table` statements for: `logs`, `user_settings`, `daily_stats`, `workout_sessions`, `workout_logs`, `exercises`, `workout_templates`, plus their RLS policies (Studio: Auth → Policies → each table → copy definition). Do not guess columns — copy from the live DB.

- [ ] **Step 2: Write the new-columns migration**

```sql
-- supabase/migrations/20260711000001_lifter_first_columns.sql
alter table public.user_settings
  add column if not exists training_day_calorie_offset integer not null default 250,
  add column if not exists rest_day_calorie_offset integer not null default 0,
  add column if not exists last_weekly_review date,
  add column if not exists weekly_review_content jsonb;
```

(`weekly_review_content` stores the generated review so "Read again" works without a second Gemini call; it is a deliberate small addition beyond the spec's named columns.)

- [ ] **Step 3: Apply the migration to the dev database**

Via CLI: `npx supabase db push` — or paste the migration SQL into the Supabase Studio SQL editor and run it. Verify:

```sql
select column_name, column_default from information_schema.columns
where table_name = 'user_settings' and column_name like '%offset%';
```

Expected: two rows, defaults `250` and `0`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: commit schema baseline and lifter-first user_settings columns"
```

---

### Task 2: `lib/workoutStats.js` — volume, best set, week bucketing

**Files:**
- Create: `src/lib/workoutStats.js`
- Test: `src/lib/__tests__/workoutStats.test.js`

**Interfaces:**
- Produces:
  - `setVolume(set) -> number` — `weight * reps` for one set object `{weight, reps, completed}`; non-numeric → 0.
  - `logsVolume(workoutLogs) -> number` — total volume across an array of workout_log rows (each has `sets` jsonb array).
  - `bestSet(workoutLogs) -> {weight, reps} | null` — max weight, ties broken by reps (same logic as `/api/workouts/history/best`).
  - `beatsBest(set, best) -> boolean` — true if `set` is a PR relative to `best` (or `best` is null and set has weight > 0).
  - `startOfWeek(dateStr) -> 'YYYY-MM-DD'` — Monday of the week containing `dateStr`.
- Consumed by: Task 9 (`lib/insights.js`), Task 13 (weekly review route).

- [ ] **Step 1: Write the failing tests**

```js
// src/lib/__tests__/workoutStats.test.js
import { setVolume, logsVolume, bestSet, beatsBest, startOfWeek } from '../workoutStats';

describe('setVolume', () => {
  it('multiplies weight by reps', () => {
    expect(setVolume({ weight: 100, reps: 5 })).toBe(500);
  });
  it('returns 0 for missing or non-numeric values', () => {
    expect(setVolume({ weight: '', reps: 5 })).toBe(0);
    expect(setVolume({})).toBe(0);
  });
  it('parses string numbers (sets are stored as strings from inputs)', () => {
    expect(setVolume({ weight: '135', reps: '8' })).toBe(1080);
  });
});

describe('logsVolume', () => {
  it('sums volume across logs and sets', () => {
    const logs = [
      { sets: [{ weight: 100, reps: 5 }, { weight: 100, reps: 5 }] },
      { sets: [{ weight: 50, reps: 10 }] },
    ];
    expect(logsVolume(logs)).toBe(1500);
  });
  it('tolerates null/malformed sets', () => {
    expect(logsVolume([{ sets: null }, {}])).toBe(0);
  });
});

describe('bestSet', () => {
  const logs = [
    { sets: [{ weight: 200, reps: 3 }, { weight: 185, reps: 8 }] },
    { sets: [{ weight: 200, reps: 5 }] },
  ];
  it('picks max weight, ties broken by reps', () => {
    expect(bestSet(logs)).toEqual({ weight: 200, reps: 5 });
  });
  it('returns null when no positive-weight sets exist', () => {
    expect(bestSet([{ sets: [{ weight: 0, reps: 10 }] }])).toBeNull();
    expect(bestSet([])).toBeNull();
  });
});

describe('beatsBest', () => {
  it('any positive-weight set beats null history', () => {
    expect(beatsBest({ weight: 45, reps: 1 }, null)).toBe(true);
  });
  it('heavier weight wins; same weight more reps wins; otherwise no', () => {
    expect(beatsBest({ weight: 205, reps: 1 }, { weight: 200, reps: 5 })).toBe(true);
    expect(beatsBest({ weight: 200, reps: 6 }, { weight: 200, reps: 5 })).toBe(true);
    expect(beatsBest({ weight: 200, reps: 5 }, { weight: 200, reps: 5 })).toBe(false);
    expect(beatsBest({ weight: 195, reps: 12 }, { weight: 200, reps: 5 })).toBe(false);
  });
});

describe('startOfWeek', () => {
  it('returns the Monday of the week', () => {
    expect(startOfWeek('2026-07-11')).toBe('2026-07-06'); // Saturday -> Monday
    expect(startOfWeek('2026-07-06')).toBe('2026-07-06'); // Monday -> itself
    expect(startOfWeek('2026-07-12')).toBe('2026-07-06'); // Sunday -> previous Monday
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/lib/__tests__/workoutStats.test.js --watchAll=false`
Expected: FAIL — `Cannot find module '../workoutStats'`.

- [ ] **Step 3: Implement**

```js
// src/lib/workoutStats.js
// Pure workout math shared by PR detection, Insights aggregation, and the weekly review.
// Mirrors the best-set semantics of /api/workouts/history/best (max weight, ties by reps;
// all sets count, not just completed ones).

export function setVolume(set) {
  if (!set) return 0;
  const weight = parseFloat(set.weight) || 0;
  const reps = parseFloat(set.reps) || 0;
  return weight * reps;
}

export function logsVolume(workoutLogs) {
  if (!Array.isArray(workoutLogs)) return 0;
  return workoutLogs.reduce((total, log) => {
    if (!log || !Array.isArray(log.sets)) return total;
    return total + log.sets.reduce((s, set) => s + setVolume(set), 0);
  }, 0);
}

export function bestSet(workoutLogs) {
  let best = { weight: 0, reps: 0 };
  (workoutLogs || []).forEach((log) => {
    if (!log || !Array.isArray(log.sets)) return;
    log.sets.forEach((set) => {
      const weight = parseFloat(set.weight) || 0;
      const reps = parseFloat(set.reps) || 0;
      if (weight > best.weight || (weight === best.weight && reps > best.reps)) {
        best = { weight, reps };
      }
    });
  });
  return best.weight > 0 ? best : null;
}

export function beatsBest(set, best) {
  const weight = parseFloat(set?.weight) || 0;
  const reps = parseFloat(set?.reps) || 0;
  if (weight <= 0) return false;
  if (!best) return true;
  return weight > best.weight || (weight === best.weight && reps > best.reps);
}

export function startOfWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const mondayOffset = (d.getDay() + 6) % 7; // Mon=0 ... Sun=6
  d.setDate(d.getDate() - mondayOffset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/lib/__tests__/workoutStats.test.js --watchAll=false`
Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/workoutStats.js src/lib/__tests__/workoutStats.test.js
git commit -m "feat: add workoutStats lib (volume, best set, week bucketing)"
```

---

### Task 3: Streak counts food OR training

**Files:**
- Create: `src/lib/streak.js`
- Test: `src/lib/__tests__/streak.test.js`
- Modify: `src/app/api/logs/route.js` (replace inline streak block, lines 58–104)
- Modify: `src/app/api/workouts/finish/route.js` (add streak update)

**Interfaces:**
- Produces: `nextStreak({ currentStreak, lastLogDate, today }) -> { streak, lastLogDate, changed }` — pure date logic. `user_settings.last_log_date` becomes "last activity date" (food OR workout); no schema change.
- Consumed by: both API routes here; Task 6 hero copy relies on the semantics.

- [ ] **Step 1: Write the failing tests**

```js
// src/lib/__tests__/streak.test.js
import { nextStreak } from '../streak';

describe('nextStreak', () => {
  it('no change when already logged today', () => {
    expect(nextStreak({ currentStreak: 4, lastLogDate: '2026-07-11', today: '2026-07-11' }))
      .toEqual({ streak: 4, lastLogDate: '2026-07-11', changed: false });
  });
  it('increments when last activity was yesterday', () => {
    expect(nextStreak({ currentStreak: 4, lastLogDate: '2026-07-10', today: '2026-07-11' }))
      .toEqual({ streak: 5, lastLogDate: '2026-07-11', changed: true });
  });
  it('resets to 1 after a gap', () => {
    expect(nextStreak({ currentStreak: 9, lastLogDate: '2026-07-08', today: '2026-07-11' }))
      .toEqual({ streak: 1, lastLogDate: '2026-07-11', changed: true });
  });
  it('starts at 1 with no history', () => {
    expect(nextStreak({ currentStreak: 0, lastLogDate: null, today: '2026-07-11' }))
      .toEqual({ streak: 1, lastLogDate: '2026-07-11', changed: true });
  });
  it('handles month boundaries', () => {
    expect(nextStreak({ currentStreak: 2, lastLogDate: '2026-06-30', today: '2026-07-01' }))
      .toEqual({ streak: 3, lastLogDate: '2026-07-01', changed: true });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/lib/__tests__/streak.test.js --watchAll=false`
Expected: FAIL — `Cannot find module '../streak'`.

- [ ] **Step 3: Implement `src/lib/streak.js`**

```js
// src/lib/streak.js
// Streak semantics: a day counts if the user logged food OR finished a workout.
// user_settings.last_log_date is the last *activity* date (either kind).

export function nextStreak({ currentStreak, lastLogDate, today }) {
  if (lastLogDate === today) {
    return { streak: currentStreak || 0, lastLogDate: today, changed: false };
  }
  const todayDate = new Date(today + 'T00:00:00');
  const yesterday = new Date(todayDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const y = yesterday.getFullYear();
  const m = String(yesterday.getMonth() + 1).padStart(2, '0');
  const d = String(yesterday.getDate()).padStart(2, '0');
  const yesterdayStr = `${y}-${m}-${d}`;

  const streak = lastLogDate === yesterdayStr ? (currentStreak || 0) + 1 : 1;
  return { streak, lastLogDate: today, changed: true };
}

// Shared server-side helper: reads settings, computes, writes back. Never throws.
export async function advanceStreak(supabase, userId, today) {
  try {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('current_streak, last_log_date')
      .eq('user_id', userId)
      .single();
    if (!settings) return;

    const result = nextStreak({
      currentStreak: settings.current_streak,
      lastLogDate: settings.last_log_date,
      today,
    });
    if (result.changed) {
      await supabase
        .from('user_settings')
        .update({ current_streak: result.streak, last_log_date: result.lastLogDate })
        .eq('user_id', userId);
    }
  } catch (e) {
    console.error('Error updating streak:', e);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/lib/__tests__/streak.test.js --watchAll=false`
Expected: PASS (5 tests).

- [ ] **Step 5: Replace the inline streak block in `src/app/api/logs/route.js`**

Add import at top: `import { advanceStreak } from '@/lib/streak';`

Delete the entire `// --- Streak Logic ---` block (from `try {` after the insert down to `// --------------------`, currently lines 58–104) and replace with:

```js
  const today = body.localDate || new Date().toISOString().split('T')[0];
  await advanceStreak(supabase, user.id, today);
```

- [ ] **Step 6: Mirror in `src/app/api/workouts/finish/route.js`**

Add import: `import { advanceStreak } from '@/lib/streak';`

After the session update succeeds (before `return NextResponse.json({ success: true });`), add:

```js
  const today = body.localDate || new Date().toISOString().split('T')[0];
  await advanceStreak(supabase, user.id, today);
```

Then in the client caller (`src/components/workout/WorkoutView.jsx`, find the fetch to `/api/workouts/finish`) add `localDate: new Date().toLocaleDateString('en-CA')` to the JSON body it already sends (`{ ids, duration }` → `{ ids, duration, localDate }`).

- [ ] **Step 7: Run the whole test suite + manual check**

Run: `npx jest --watchAll=false`
Expected: PASS (existing daily-stats tests + new suites).
Manual: `npm run dev`, finish a workout with no food logged today → `user_settings.last_log_date` becomes today, streak increments (check Supabase Studio table editor).

- [ ] **Step 8: Commit**

```bash
git add src/lib/streak.js src/lib/__tests__/streak.test.js src/app/api/logs/route.js src/app/api/workouts/finish/route.js src/components/workout/WorkoutView.jsx
git commit -m "feat: streak counts food or training days via shared advanceStreak helper"
```

---

### Task 4: Visual system groundwork

**Files:**
- Modify: `src/app/globals.css` (add `@theme` tokens)
- Modify: `src/app/layout.jsx` (Barlow Condensed via next/font, metadata copy)
- Modify: `src/components/dashboard/DailyProgress.jsx:109` (remove blur blob — full rework comes in Task 6, this is just the blob line)
- Modify: `src/components/dashboard/MealFeed.jsx` (replace 🍽️ emoji avatar with Lucide `Utensils` tile)
- Delete: `src/components/BottomNav.jsx` (dead duplicate nav that omits Workouts)

**Interfaces:**
- Produces: Tailwind utilities `text-protein`, `bg-protein`, `text-protein-strong`, `stroke-protein`, `font-display` (+ CSS vars `--color-protein`, `--color-protein-strong`, `--color-training`). All later UI tasks use these instead of raw emerald/indigo classes for the semantic roles.

- [ ] **Step 1: Add theme tokens to `src/app/globals.css`**

Directly after the `@import` lines at the top, add:

```css
@theme {
  --color-protein: #10b981;        /* emerald-500 — protein hero */
  --color-protein-strong: #059669; /* emerald-600 — small text on white (4.5:1) */
  --color-training: #4f46e5;       /* indigo-600 — training/brand */
  --font-display: var(--font-barlow-condensed), ui-sans-serif, system-ui, sans-serif;
}
```

- [ ] **Step 2: Load Barlow Condensed in `src/app/layout.jsx`**

Replace the whole file with:

```jsx
import './globals.css'
import { Barlow_Condensed } from 'next/font/google'

const barlowCondensed = Barlow_Condensed({
  weight: ['600', '700'],
  subsets: ['latin'],
  variable: '--font-barlow-condensed',
  display: 'swap',
})

export const metadata = {
  title: 'Liftly',
  description: 'The lifting app where nutrition serves your training',
  appleWebApp: {
    capable: true,
    title: 'Liftly',
    statusBarStyle: 'default',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={barlowCondensed.variable}>
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 3: Remove the decorative blur blob**

In `src/components/dashboard/DailyProgress.jsx` delete line 109:

```jsx
<div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-10 -mt-10 blur-2xl opacity-50"></div>
```

- [ ] **Step 4: Replace the emoji avatar in `src/components/dashboard/MealFeed.jsx`**

Find the meal-row avatar that renders `🍽️` (a span/div with the emoji). Replace that element with:

```jsx
<div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
  <Utensils className="w-5 h-5 text-slate-500" />
</div>
```

and add `Utensils` to the file's existing `lucide-react` import.

- [ ] **Step 5: Delete dead nav component**

```bash
git rm src/components/BottomNav.jsx
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: compiles clean; no import errors from the deleted file (nothing imports it — verify with `grep -r "BottomNav" src/` → no results).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: semantic color tokens, display font, dead-code and emoji cleanup"
```

---

### Task 5: Navigation restructure

**Files:**
- Modify: `src/app/page.jsx` (bottom nav order/labels, Settings → header gear, action sheet reorder, new `insights` tab slot)
- Modify: `src/components/Sidebar.jsx` (reorder, Settings pinned bottom, Log CTA replaces "Add Meal" nav item)

**Interfaces:**
- Consumes: nothing new.
- Produces: `activeTab` gains the value `'insights'` (rendered as a placeholder `div` until Task 11 lands `InsightsView`). Tab keys stay `home | workouts | add | insights | history | settings`.

- [ ] **Step 1: Rework the mobile bottom nav in `src/app/page.jsx`**

Add `BarChart3` to the lucide import. Replace the four `NavButton`s + FAB block (lines ~401–434) so the order is **Today · Train · FAB · Insights · History**:

```jsx
<NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={Home} label="Today" />
<NavButton active={activeTab === 'workouts'} onClick={() => setActiveTab('workouts')} icon={Dumbbell} label="Train" />

<div className="-mt-12">
  <button
    onClick={() => setShowActionSheet(true)}
    className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 bg-indigo-600 text-white"
  >
    <Plus className="w-8 h-8" />
  </button>
</div>

<NavButton active={activeTab === 'insights'} onClick={() => setActiveTab('insights')} icon={BarChart3} label="Insights" />
<NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={Calendar} label="History" />
```

- [ ] **Step 2: Move Settings to the mobile header**

In the mobile `<header>` (lines ~308–328), replace the single logout button with a two-button group (gear first, then logout):

```jsx
<div className="flex items-center gap-1">
  <button
    onClick={() => setActiveTab('settings')}
    className={`p-2 rounded-full transition-colors ${activeTab === 'settings' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
    title="Settings"
  >
    <Settings className="w-5 h-5" />
  </button>
  <button
    onClick={handleLogout}
    className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
    title="Sign Out"
  >
    <LogOut className="w-5 h-5" />
  </button>
</div>
```

- [ ] **Step 3: Add the `insights` tab render slot in `<main>`**

After the `history` block:

```jsx
{activeTab === 'insights' && (
  <div className="p-6 text-slate-400 text-sm">Insights coming in Task 11.</div>
)}
```

- [ ] **Step 4: Reorder the action sheet — Log Workout first**

In the action sheet grid (lines ~475–505), move the **Log Workout** button before **Log Meal** (swap the two `<button>` blocks verbatim). Keep colors as they are (workout = indigo, meal = purple).

- [ ] **Step 5: Rework `src/components/Sidebar.jsx`**

Replace the `<nav>` content with, in order: Today (`home`, label "Today"), Train (`workouts`, label "Train"), Insights (`insights`, `BarChart3` icon), History, then a spacer, then a full-width Log CTA, and move Settings down next to Sign Out:

```jsx
<nav className="flex-1 space-y-2">
  {/* Today / Train / Insights / History buttons — same button markup as existing, new order/labels */}
</nav>

<button
  onClick={onOpenLog}
  className="w-full flex items-center justify-center gap-2 py-3 mb-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200"
>
  <Plus className="w-5 h-5" />
  <span>Log</span>
</button>

<div className="border-t border-slate-100 pt-2 space-y-1">
  {/* Settings button (same markup as existing nav buttons) */}
  {/* Sign Out button (existing) */}
</div>
```

Each nav button keeps the exact existing class pattern (`bg-indigo-50 text-indigo-600 font-medium` active / `text-slate-500 hover:bg-slate-50` idle). Add the new prop: `export default function Sidebar({ activeTab, setActiveTab, onLogout, onOpenLog })`, and in `page.jsx` pass `onOpenLog={() => setShowActionSheet(true)}`. Remove the old "Add Meal" nav button (`add` tab stays reachable via the action sheet).

- [ ] **Step 6: Manual verify**

`npm run dev` → mobile viewport (375px): nav shows Today/Train/+/Insights/History; gear in header opens Settings; FAB sheet lists Log Workout first. Desktop: sidebar order Today/Train/Insights/History, Log CTA opens sheet, Settings above Sign Out.

- [ ] **Step 7: Commit**

```bash
git add src/app/page.jsx src/components/Sidebar.jsx
git commit -m "feat: lifter-first navigation (Insights slot, Settings to header, workout-first action sheet)"
```

---

### Task 6: Hero card rework — concentric protein/calorie rings

**Files:**
- Modify: `src/components/dashboard/DailyProgress.jsx` (replace the 4-ring grid with hero layout; keep goal-edit overlay and AI buttons)
- Modify: `src/components/Dashboard.jsx` (remove `MacroDistribution` usage; `WeeklyTrend` takes its row full-width)
- Keep (unused, delete file): `src/components/dashboard/MacroDistribution.jsx` — `git rm`

**Interfaces:**
- Consumes: theme tokens from Task 4 (`text-protein`, `font-display`).
- Produces: `DailyProgress` props unchanged EXCEPT two new optional props consumed in Task 8: `trainingDay` (bool) and `calorieOffset` (number). Until Task 8, callers omit them (defaults `false` / `0`).

- [ ] **Step 1: Replace the ring grid in `DailyProgress.jsx`**

Delete the `CircleChart` component and the `grid-cols-4` block (lines ~4–56 and ~138–171). Add the new hero in their place. Complete new ring + bar markup:

```jsx
const DualRing = ({ protein, proteinGoal, calories, calorieGoal, baseCalorieGoal, onEditProtein, onEditCalories }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const outer = { r: 42, w: 9 };  // protein
  const inner = { r: 31, w: 5 };  // calories
  const ring = (r) => 2 * Math.PI * r;
  const pct = (v, m) => Math.min(Math.max(v / (m || 1), 0), 1);
  const offset = (r, v, m) => ring(r) - (mounted ? pct(v, m) : 0) * ring(r);
  // ghost notch: marks the base (rest-day) goal position on the calorie ring
  const notchAngle = pct(baseCalorieGoal, calorieGoal) * 360 - 90;

  return (
    <div className="relative w-56 h-56 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={outer.r} fill="none" strokeWidth={outer.w} className="stroke-slate-100" stroke="currentColor" />
        <circle cx="50" cy="50" r={outer.r} fill="none" strokeWidth={outer.w} strokeLinecap="round"
          stroke="var(--color-protein)" strokeDasharray={ring(outer.r)} strokeDashoffset={offset(outer.r, protein, proteinGoal)}
          className="transition-all duration-700 ease-out motion-reduce:transition-none" />
        <circle cx="50" cy="50" r={inner.r} fill="none" strokeWidth={inner.w} className="stroke-slate-100" stroke="currentColor" />
        <circle cx="50" cy="50" r={inner.r} fill="none" strokeWidth={inner.w} strokeLinecap="round"
          stroke="#334155" strokeDasharray={ring(inner.r)} strokeDashoffset={offset(inner.r, calories, calorieGoal)}
          className="transition-all duration-700 ease-out motion-reduce:transition-none" />
        {baseCalorieGoal !== calorieGoal && (
          <line x1="50" y1={50 - inner.r - inner.w / 2} x2="50" y2={50 - inner.r + inner.w / 2}
            stroke="#cbd5e1" strokeWidth="1.5" transform={`rotate(${notchAngle + 90} 50 50)`} />
        )}
      </svg>
      <button onClick={onEditProtein}
        className="absolute inset-0 flex flex-col items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-emerald-400"
        aria-label={`Protein ${protein} of ${proteinGoal} grams. Edit goal.`}>
        <span className="font-display text-5xl font-bold text-slate-800 tabular-nums leading-none">{protein}</span>
        <span className="text-sm font-semibold text-protein-strong tabular-nums">/ {proteinGoal} g protein</span>
        <span className="text-xs text-slate-400 tabular-nums mt-1">{calories} / {calorieGoal} kcal</span>
      </button>
    </div>
  );
};
```

Below the ring, slim carb/fat bars (replaces MacroDistribution's job):

```jsx
const MacroBar = ({ label, value, max, barClass, onClick }) => (
  <button onClick={onClick} className="flex-1 text-left group" aria-label={`${label} ${value} of ${max} grams. Edit goal.`}>
    <div className="flex justify-between text-xs font-semibold mb-1">
      <span className="text-slate-500 group-hover:text-slate-700">{label}</span>
      <span className="text-slate-400 tabular-nums">{value} / {max} g</span>
    </div>
    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full ${barClass} transition-all duration-700 motion-reduce:transition-none`}
        style={{ width: `${Math.min(100, (value / (max || 1)) * 100)}%` }} />
    </div>
  </button>
);
```

Wire into the component body (replacing the old grid), signature gains `trainingDay = false, calorieOffset = 0`:

```jsx
const effectiveCalorieGoal = currentGoals.calories + (trainingDay ? calorieOffset : 0);

<DualRing
  protein={macros.protein} proteinGoal={currentGoals.protein}
  calories={caloriesToday} calorieGoal={effectiveCalorieGoal} baseCalorieGoal={currentGoals.calories}
  onEditProtein={() => handleStartEdit('protein', currentGoals.protein)}
  onEditCalories={() => handleStartEdit('calories', currentGoals.calories)}
/>
<div className="flex gap-6 mt-6">
  <MacroBar label="Carbs" value={macros.carbs} max={currentGoals.carbs} barClass="bg-amber-500"
    onClick={() => handleStartEdit('carbs', currentGoals.carbs)} />
  <MacroBar label="Fats" value={macros.fats} max={currentGoals.fats} barClass="bg-rose-500"
    onClick={() => handleStartEdit('fats', currentGoals.fats)} />
</div>
```

Also: a small "Calories" text-button under the bars opens `handleStartEdit('calories', ...)` (the ring button edits protein; calories needs its own affordance):

```jsx
<button onClick={() => handleStartEdit('calories', currentGoals.calories)}
  className="mt-3 text-xs font-semibold text-slate-400 hover:text-slate-600">
  Edit calorie goal
</button>
```

Update the streak copy (line ~118): `🔥 Log a meal today...` →

```jsx
<p className="text-xs font-medium text-rose-500 mt-1">
  Log food or train today to keep your {streak} day streak!
</p>
```

(drop the emoji and the `animate-pulse`). Subheading "Tap any ring to edit your goal" → "Fuel your training". Section header `<h2>` gains `font-display`.

- [ ] **Step 2: Remove MacroDistribution from `Dashboard.jsx`**

Delete the import and the Row-3 right column; `WeeklyTrend` becomes full width:

```jsx
{/* Row 3: Weekly Trend */}
<div className="w-full">
  <WeeklyTrend weeklyData={weeklyData} />
</div>
```

Then: `git rm src/components/dashboard/MacroDistribution.jsx`.

Also demote hydration: in `Dashboard.jsx`'s right column, `HydrationTracker` loses its `flex-1 min-h-0` wrapper and moves to the BOTTOM of the page (after MealFeed) as a plain full-width row — its internal markup is untouched:

```jsx
{/* Row 5: Hydration (demoted) */}
<div className="w-full">
  <HydrationTracker waterIntake={dailyStats.water_intake} onUpdateWater={handleUpdateWater} />
</div>
```

- [ ] **Step 3: Manual verify**

`npm run dev`: hero shows big emerald protein ring with condensed numeral, thin slate calorie ring, carb/fat bars animate in, goal-edit overlay still opens for all four metrics, streak chip unchanged. Keyboard: Tab reaches ring and bars (they are `<button>`s now).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: concentric protein-hero ring replaces 4-ring grid and macro donut"
```

---

### Task 7: Quick Protein card

**Files:**
- Create: `src/components/dashboard/QuickProtein.jsx`
- Modify: `src/components/Dashboard.jsx` (swap `QuickAdd` → `QuickProtein`)
- Delete: `src/components/dashboard/QuickAdd.jsx`

**Interfaces:**
- Consumes: `addLog(userId, logData)` and `deleteLog(logId, userId)` from `src/lib/api.js`; `POST /api/logs` returns the created row (has `.id`) — used for Undo.
- Produces: `<QuickProtein user onLogAdded />`. Log entries: `{ foodItem, calories, protein, carbs: 0, fats: 0, mealType: 'snack', method: 'quick-protein' }`. Presets persisted in `localStorage['snapcal_protein_presets']` as `[{ id, name, protein, calories }]`.

- [ ] **Step 1: Implement `QuickProtein.jsx`**

```jsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Beef, Plus, Minus, Check, X } from 'lucide-react';
import { addLog, deleteLog } from '@/lib/api';

const DEFAULT_PRESETS = [
  { id: 'chicken', name: 'Chicken breast', protein: 31, calories: 165 },
  { id: 'shake', name: 'Protein shake', protein: 25, calories: 130 },
  { id: 'eggs', name: '3 Eggs', protein: 19, calories: 215 },
  { id: 'yogurt', name: 'Greek yogurt', protein: 17, calories: 100 },
  { id: 'tuna', name: 'Tuna can', protein: 25, calories: 120 },
];

export default function QuickProtein({ user, onLogAdded }) {
  const [presets, setPresets] = useState(DEFAULT_PRESETS);
  const [activeId, setActiveId] = useState(null); // chip expanded with stepper
  const [portions, setPortions] = useState(1);
  const [toast, setToast] = useState(null); // { logId, name }
  const toastTimer = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('snapcal_protein_presets');
      if (saved) setPresets(JSON.parse(saved));
    } catch { /* keep defaults */ }
  }, []);

  const logPreset = async (preset) => {
    const qty = portions;
    setActiveId(null);
    setPortions(1);
    try {
      const created = await addLog(user.id, {
        foodItem: qty > 1 ? `${preset.name} ×${qty}` : preset.name,
        calories: preset.calories * qty,
        protein: preset.protein * qty,
        carbs: 0,
        fats: 0,
        mealType: 'snack',
        method: 'quick-protein',
      });
      if (onLogAdded) onLogAdded();
      clearTimeout(toastTimer.current);
      setToast({ logId: created?.id, name: preset.name });
      toastTimer.current = setTimeout(() => setToast(null), 5000);
    } catch (e) {
      console.error('Quick protein log failed', e);
      setToast({ error: true, name: preset.name });
      toastTimer.current = setTimeout(() => setToast(null), 5000);
    }
  };

  const undo = async () => {
    if (toast?.logId) {
      try {
        await deleteLog(toast.logId, user.id);
        if (onLogAdded) onLogAdded();
      } catch (e) { console.error('Undo failed', e); }
    }
    clearTimeout(toastTimer.current);
    setToast(null);
  };

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 relative">
      <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
        <Beef className="w-4 h-4 text-protein" />
        Quick Protein
      </h4>
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <motion.button
            layout
            key={p.id}
            onClick={() => (activeId === p.id ? logPreset(p) : (setActiveId(p.id), setPortions(1)))}
            className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold border transition-colors active:scale-95 min-h-11 ${
              activeId === p.id
                ? 'border-emerald-400 bg-emerald-50 text-slate-800'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{p.name}</span>
            <span className="text-protein-strong tabular-nums">{p.protein * (activeId === p.id ? portions : 1)}g</span>
            {activeId === p.id && (
              <span className="flex items-center gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
                <span role="button" aria-label="Fewer portions" onClick={() => setPortions((n) => Math.max(1, n - 1))}
                  className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                  <Minus className="w-3 h-3" />
                </span>
                <span className="tabular-nums text-xs w-6 text-center">×{portions}</span>
                <span role="button" aria-label="More portions" onClick={() => setPortions((n) => Math.min(9, n + 1))}
                  className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                  <Plus className="w-3 h-3" />
                </span>
                <span role="button" aria-label="Log it" onClick={() => logPreset(p)}
                  className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center ml-0.5">
                  <Check className="w-3.5 h-3.5" />
                </span>
              </span>
            )}
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            role="status" aria-live="polite"
            className="absolute left-4 right-4 -bottom-3 translate-y-full sm:bottom-4 sm:translate-y-0 bg-slate-900 text-white text-sm rounded-xl px-4 py-3 flex items-center justify-between shadow-lg z-10"
          >
            <span>{toast.error ? `Couldn't save ${toast.name}` : `Logged ${toast.name}`}</span>
            {!toast.error && (
              <button onClick={undo} className="font-bold text-emerald-300 ml-3">Undo</button>
            )}
            <button onClick={() => setToast(null)} aria-label="Dismiss" className="ml-3 text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 1b: Preset editing (spec: presets are user-editable)**

Add a small "Edit" text-button in the card header (`<button onClick={() => setEditing(v => !v)} className="text-xs font-semibold text-slate-400 hover:text-slate-600">Edit</button>`). In editing mode each chip shows a small ✕ that removes it, and a final `+ Add` chip opens a 3-field inline mini-form (name, protein g, calories) appended on save. Any change writes the full array to `localStorage['snapcal_protein_presets']`:

```jsx
const savePresets = (next) => {
  setPresets(next);
  try { localStorage.setItem('snapcal_protein_presets', JSON.stringify(next)); } catch { /* ignore */ }
};
// remove: savePresets(presets.filter((x) => x.id !== p.id))
// add:    savePresets([...presets, { id: crypto.randomUUID(), name, protein: parseInt(protein) || 0, calories: parseInt(calories) || 0 }])
```

State: `const [editing, setEditing] = useState(false);` plus three controlled inputs for the add form. Keep it inside this component — no new files.

- [ ] **Step 2: Swap it into `Dashboard.jsx`**

Replace the `QuickAdd` import + usage:

```jsx
import QuickProtein from './dashboard/QuickProtein';
// ...
<QuickProtein user={user} onLogAdded={onLogAdded} />
```

Remove the now-unused `handleQuickAdd` function and the `addLog` import if nothing else uses it. Then `git rm src/components/dashboard/QuickAdd.jsx`.

- [ ] **Step 3: Manual verify**

Two taps: chip → check = logged; hero protein ring advances; Undo removes the row (verify in MealFeed). Failure path: stop dev Supabase env vars → error toast (then restore).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: Quick Protein preset chips replace calorie-only QuickAdd"
```

---

### Task 8: Training-day-aware targets

**Files:**
- Modify: `src/app/api/user/settings/route.js` (accept the two offset fields as manual updates)
- Modify: `src/app/page.jsx` (derive `isTrainingDay` + offsets, pass to Dashboard)
- Modify: `src/components/Dashboard.jsx` (pass through to `DailyProgress`)
- Modify: `src/components/dashboard/DailyProgress.jsx` (training-day pill with Adjust/Skip popover)

**Interfaces:**
- Consumes: `user_settings.training_day_calorie_offset` / `rest_day_calorie_offset` (Task 1), `DailyProgress` props `trainingDay` / `calorieOffset` (Task 6 scaffolding).
- Produces: `page.jsx` computes `isTrainingDay` (active session OR completed workout log today) and `calorieOffset`; skip-state stored in `localStorage['snapcal_skip_bump_' + todayStr]`.

- [ ] **Step 1: Accept offsets in the settings API**

In `src/app/api/user/settings/route.js`, in the manual-updates `else` branch (after `if (body.fatsGoal) ...`), add:

```js
    if (body.trainingDayOffset !== undefined) updates.training_day_calorie_offset = parseInt(body.trainingDayOffset) || 0;
    if (body.restDayOffset !== undefined) updates.rest_day_calorie_offset = parseInt(body.restDayOffset) || 0;
```

- [ ] **Step 2: Derive training-day state in `page.jsx`**

With the other derived state (after `todaysLogs`), add:

```jsx
  const trainedToday = (activeWorkoutLogs?.length > 0) || workoutLogs.some((l) => {
    const d = new Date(l.date);
    return d.toDateString() === today.toDateString();
  });
  const todayStr = today.toLocaleDateString('en-CA');
  const [bumpSkipped, setBumpSkipped] = useState(false);
  useEffect(() => {
    setBumpSkipped(localStorage.getItem('snapcal_skip_bump_' + todayStr) === '1');
  }, [todayStr]);

  const settingsCache = (() => {
    try { return JSON.parse(localStorage.getItem('snapcal_settings') || '{}'); } catch { return {}; }
  })();
  const trainingOffset = settingsCache.training_day_calorie_offset ?? 250;
  const restOffset = settingsCache.rest_day_calorie_offset ?? 0;
  const isTrainingDay = trainedToday && !bumpSkipped;
  const calorieOffset = isTrainingDay ? trainingOffset : restOffset;
```

(`useState`/`useEffect` go at the top with the other hooks — hooks cannot sit mid-function; place the derivation after them.) Pass to Dashboard: `trainingDay={isTrainingDay} calorieOffset={calorieOffset} onToggleBumpSkip={...} onUpdateGoal={handleUpdateGoal}` where the toggle writes/clears the localStorage key and updates state:

```jsx
  const handleToggleBumpSkip = () => {
    const next = !bumpSkipped;
    setBumpSkipped(next);
    if (next) localStorage.setItem('snapcal_skip_bump_' + todayStr, '1');
    else localStorage.removeItem('snapcal_skip_bump_' + todayStr);
  };
```

Also: `caloriesToday`-based `percentComplete` and `remaining` should use `dailyGoal + calorieOffset` so the AI-suggestion budget matches the displayed goal.

- [ ] **Step 3: Pill UI in `DailyProgress.jsx`**

Component signature gains `onToggleBumpSkip` and `offsetSkipped` (pass `bumpSkipped` down through Dashboard). Under the header (next to the streak chip area), render when the user trained today:

```jsx
{(trainingDay || offsetSkipped) && (
  <div className="relative inline-block min-h-7 mt-1">
    <button
      onClick={() => setShowBumpPopover((v) => !v)}
      className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
        trainingDay
          ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
          : 'bg-slate-50 text-slate-400 border-slate-100'
      }`}
    >
      {trainingDay ? `Training day +${calorieOffset}` : 'Training bump off (+0)'}
    </button>
    {showBumpPopover && (
      <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 w-64 z-20">
        <p className="text-xs text-slate-500 mb-3">
          Training days adjust your calorie target. Base goal stays marked on the ring.
        </p>
        <div className="flex gap-2">
          <button onClick={() => { setShowBumpPopover(false); setEditingOffset(true); }}
            className="flex-1 py-2 text-xs font-bold bg-slate-100 rounded-xl text-slate-600">Adjust</button>
          <button onClick={() => { setShowBumpPopover(false); onToggleBumpSkip(); }}
            className="flex-1 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl">
            {trainingDay ? 'Skip today' : 'Re-apply'}
          </button>
        </div>
      </div>
    )}
  </div>
)}
```

"Adjust" reuses the existing goal-edit overlay pattern: add an `editingOffset` state that shows the same overlay with the offset value, saving via `onUpdateGoal({ trainingDayOffset: parseInt(tempGoalValue) })` (which flows through `handleUpdateGoal` → `updateUserSettings`; add a `trainingDayOffset` passthrough case in `handleUpdateGoal` that skips the optimistic dailyGoal update and just refetches).

New state hooks at top of component: `const [showBumpPopover, setShowBumpPopover] = useState(false); const [editingOffset, setEditingOffset] = useState(false);`

- [ ] **Step 4: Manual verify**

No workout today → no pill, base goal. Start a workout (Train tab, add an exercise) → return Today: pill "Training day +250", calorie ring max is base+250, ghost notch visible at base. Skip today → pill greys, goal reverts, persists on reload. Adjust → overlay saves new offset; Supabase `user_settings` row updates.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: training-day calorie bump with pill, skip, and adjustable offset"
```

---

### Task 9: `lib/insights.js` — aggregation logic

**Files:**
- Create: `src/lib/insights.js`
- Test: `src/lib/__tests__/insights.test.js`

**Interfaces:**
- Consumes: `logsVolume`, `beatsBest`, `startOfWeek` from `src/lib/workoutStats.js` (Task 2).
- Produces: `aggregateInsights({ foodLogs, workoutLogs, dailyStats, dailyGoal, weeks }) -> { weeks: [{weekStart, volume, avgProtein, avgCalories, daysLogged}], prEvents: [{date, exercise, weight, reps, dayProtein, dayCalories, prevDayProtein, prevDayCalories}], weightSeries: [{date, weight, balance}], foodDaysLogged }`
  - `foodLogs`: rows from `logs` (need `date`, `calories`, `protein`).
  - `workoutLogs`: rows from `workout_logs` joined to completed sessions, sorted ascending by `date` (need `date`, `exercise_name`, `sets`).
  - `dailyStats`: rows from `daily_stats` (need `date` 'YYYY-MM-DD', `weight`).
  - `balance` = day's calories − `dailyGoal` (goal-relative, not TDEE).
  - `foodDaysLogged` = distinct days in range with ≥1 food log — drives locked states (unlock at 7).
- Consumed by: Task 10 route, Task 13 weekly review.

- [ ] **Step 1: Write the failing tests**

```js
// src/lib/__tests__/insights.test.js
import { aggregateInsights, dayKey } from '../insights';

const food = (date, calories, protein) => ({ date: date + 'T12:00:00.000Z', calories, protein });
const lift = (date, exercise_name, sets) => ({ date: date + 'T17:00:00.000Z', exercise_name, sets });

describe('dayKey', () => {
  it('extracts YYYY-MM-DD from an ISO timestamp', () => {
    expect(dayKey('2026-07-08T17:00:00.000Z')).toBe('2026-07-08');
  });
});

describe('aggregateInsights', () => {
  const foodLogs = [
    food('2026-07-06', 2200, 150), food('2026-07-07', 1900, 120),
    food('2026-07-08', 2400, 160),
  ];
  const workoutLogs = [
    lift('2026-07-06', 'Bench Press', [{ weight: 185, reps: 5 }]),
    lift('2026-07-08', 'Bench Press', [{ weight: 205, reps: 5 }]), // PR vs the 6th
  ];
  const dailyStats = [
    { date: '2026-07-06', weight: 180 }, { date: '2026-07-08', weight: 179.4 },
  ];

  const result = aggregateInsights({ foodLogs, workoutLogs, dailyStats, dailyGoal: 2000, weeks: 4 });

  it('buckets weekly volume and nutrition averages', () => {
    const wk = result.weeks.find((w) => w.weekStart === '2026-07-06');
    expect(wk.volume).toBe(185 * 5 + 205 * 5);
    expect(wk.avgProtein).toBe(Math.round((150 + 120 + 160) / 3));
    expect(wk.avgCalories).toBe(Math.round((2200 + 1900 + 2400) / 3));
    expect(wk.daysLogged).toBe(3);
  });

  it('detects PR events with surrounding nutrition', () => {
    expect(result.prEvents).toHaveLength(2); // first-ever set is also a PR
    const pr = result.prEvents.find((p) => p.date === '2026-07-08');
    expect(pr).toMatchObject({
      exercise: 'Bench Press', weight: 205, reps: 5,
      dayProtein: 160, dayCalories: 2400,
      prevDayProtein: 120, prevDayCalories: 1900,
    });
  });

  it('builds a weight series with goal-relative balance', () => {
    expect(result.weightSeries).toEqual([
      { date: '2026-07-06', weight: 180, balance: 200 },
      { date: '2026-07-08', weight: 179.4, balance: 400 },
    ]);
  });

  it('counts distinct food-logged days', () => {
    expect(result.foodDaysLogged).toBe(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/lib/__tests__/insights.test.js --watchAll=false`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/insights.js`**

```js
// src/lib/insights.js
// Pure aggregation joining nutrition (logs), training (workout_logs), and body (daily_stats).
import { logsVolume, beatsBest, startOfWeek } from './workoutStats';

export function dayKey(isoDate) {
  return String(isoDate).slice(0, 10);
}

export function aggregateInsights({ foodLogs = [], workoutLogs = [], dailyStats = [], dailyGoal = 2000, weeks = 4 }) {
  // Per-day nutrition totals
  const dayNutrition = {};
  foodLogs.forEach((l) => {
    const day = dayKey(l.date);
    if (!dayNutrition[day]) dayNutrition[day] = { calories: 0, protein: 0 };
    dayNutrition[day].calories += parseInt(l.calories) || 0;
    dayNutrition[day].protein += parseInt(l.protein) || 0;
  });

  // Weekly buckets
  const weekMap = {};
  const bucket = (day) => {
    const wk = startOfWeek(day);
    if (!weekMap[wk]) weekMap[wk] = { weekStart: wk, volume: 0, calories: 0, protein: 0, daysLogged: 0 };
    return weekMap[wk];
  };
  Object.entries(dayNutrition).forEach(([day, n]) => {
    const wk = bucket(day);
    wk.calories += n.calories;
    wk.protein += n.protein;
    wk.daysLogged += 1;
  });
  const byDay = {};
  workoutLogs.forEach((l) => {
    const day = dayKey(l.date);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(l);
  });
  Object.entries(byDay).forEach(([day, logs]) => {
    bucket(day).volume += logsVolume(logs);
  });

  const weekList = Object.values(weekMap)
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .slice(-weeks)
    .map((w) => ({
      weekStart: w.weekStart,
      volume: Math.round(w.volume),
      avgProtein: w.daysLogged ? Math.round(w.protein / w.daysLogged) : 0,
      avgCalories: w.daysLogged ? Math.round(w.calories / w.daysLogged) : 0,
      daysLogged: w.daysLogged,
    }));

  // PR events: walk chronologically, track best per exercise
  const bestByExercise = {};
  const prEvents = [];
  [...workoutLogs]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .forEach((log) => {
      const sets = Array.isArray(log.sets) ? log.sets : [];
      sets.forEach((set) => {
        const best = bestByExercise[log.exercise_name] || null;
        if (beatsBest(set, best)) {
          bestByExercise[log.exercise_name] = {
            weight: parseFloat(set.weight) || 0,
            reps: parseFloat(set.reps) || 0,
          };
          const day = dayKey(log.date);
          const prev = new Date(day + 'T00:00:00');
          prev.setDate(prev.getDate() - 1);
          const prevDay = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`;
          prEvents.push({
            date: day,
            exercise: log.exercise_name,
            weight: bestByExercise[log.exercise_name].weight,
            reps: bestByExercise[log.exercise_name].reps,
            dayProtein: dayNutrition[day]?.protein ?? null,
            dayCalories: dayNutrition[day]?.calories ?? null,
            prevDayProtein: dayNutrition[prevDay]?.protein ?? null,
            prevDayCalories: dayNutrition[prevDay]?.calories ?? null,
          });
        }
      });
    });

  // Collapse multiple PRs on the same exercise+day to the final (best) one
  const dedup = {};
  prEvents.forEach((p) => { dedup[p.exercise + p.date] = p; });

  const weightSeries = dailyStats
    .filter((s) => s.weight != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({
      date: s.date,
      weight: parseFloat(s.weight),
      balance: dayNutrition[s.date] ? dayNutrition[s.date].calories - dailyGoal : 0,
    }));

  return {
    weeks: weekList,
    prEvents: Object.values(dedup).sort((a, b) => a.date.localeCompare(b.date)),
    weightSeries,
    foodDaysLogged: Object.keys(dayNutrition).length,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/lib/__tests__/insights.test.js --watchAll=false`
Expected: PASS. (If the same-day dedup makes the PR count assertion fail — two PRs for Bench on different days must both survive — the test expects exactly 2; dedup only collapses same exercise+same day.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/insights.js src/lib/__tests__/insights.test.js
git commit -m "feat: insights aggregation lib (weekly volume vs nutrition, PR events, weight/balance)"
```

---

### Task 10: `/api/insights` route

**Files:**
- Create: `src/app/api/insights/route.js`
- Modify: `src/lib/api.js` (add `getInsights(weeks)` wrapper)

**Interfaces:**
- Consumes: `aggregateInsights` (Task 9).
- Produces: `GET /api/insights?weeks=4|8|12` → the Task 9 return shape as JSON. Client wrapper: `getInsights(weeks) -> Promise<object>`.

- [ ] **Step 1: Implement the route**

```js
// src/app/api/insights/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { aggregateInsights } from '@/lib/insights';

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const weeks = Math.min(parseInt(searchParams.get('weeks')) || 4, 12);
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);
  const sinceIso = since.toISOString();
  const sinceDay = sinceIso.split('T')[0];

  const [foodRes, workoutRes, statsRes, settingsRes] = await Promise.all([
    supabase.from('logs').select('date, calories, protein').eq('user_id', user.id).gte('date', sinceIso),
    supabase.from('workout_logs')
      .select('date, exercise_name, sets, workout_sessions!inner(status)')
      .eq('user_id', user.id).eq('workout_sessions.status', 'completed').gte('date', sinceIso),
    supabase.from('daily_stats').select('date, weight').eq('user_id', user.id).gte('date', sinceDay),
    supabase.from('user_settings').select('daily_goal').eq('user_id', user.id).single(),
  ]);

  const firstError = foodRes.error || workoutRes.error || statsRes.error;
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const result = aggregateInsights({
    foodLogs: foodRes.data || [],
    workoutLogs: workoutRes.data || [],
    dailyStats: statsRes.data || [],
    dailyGoal: settingsRes.data?.daily_goal || 2000,
    weeks,
  });

  return NextResponse.json({ ...result, dailyGoal: settingsRes.data?.daily_goal || 2000 });
}
```

(The response includes `dailyGoal` so chart cards can reconstruct absolute calories from goal-relative `balance` without a second fetch.)

- [ ] **Step 2: Add the client wrapper to `src/lib/api.js`**

```js
export async function getInsights(weeks = 4) {
  const res = await fetch(`/api/insights?weeks=${weeks}`);
  if (!res.ok) throw new Error('Failed to fetch insights');
  return res.json();
}
```

(Match the file's existing wrapper style — check a neighbor like `getWorkoutLogs()` and mirror its error convention exactly.)

- [ ] **Step 3: Manual verify**

`npm run dev`, log in, then in the browser console: `await (await fetch('/api/insights?weeks=4')).json()` → object with `weeks`, `prEvents`, `weightSeries`, `foodDaysLogged`. Unauthenticated curl gets 401.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/insights/route.js src/lib/api.js
git commit -m "feat: /api/insights aggregation endpoint with client wrapper"
```

---

### Task 11: Insights tab UI

**Files:**
- Create: `src/components/insights/InsightsView.jsx` (container: range control, data fetch, locked gate)
- Create: `src/components/insights/ChartStates.jsx` (LockedCard / EmptyCard / SkeletonCard shared shells)
- Create: `src/components/insights/InsightTooltip.jsx`
- Create: `src/components/insights/VolumeProteinCard.jsx`
- Create: `src/components/insights/PrTimelineCard.jsx`
- Create: `src/components/insights/WeightBalanceCard.jsx`
- Modify: `src/app/page.jsx` (replace the Task 5 placeholder with `<InsightsView user={user} />`)
- Modify: `src/components/Dashboard.jsx` (remove the `WeightTrend` row — it moves to Insights)

**Interfaces:**
- Consumes: `getInsights(weeks)` (Task 10); theme tokens; existing `WeightTrend.jsx` pill-toggle + dashed-placeholder patterns as style reference.
- Produces: `<InsightsView user />`. Each card receives the full insights object and renders its own empty state.

- [ ] **Step 1: Shared states — `ChartStates.jsx`**

```jsx
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
          <div className="h-full bg-protein rounded-full" style={{ width: `${(daysLogged / daysNeeded) * 100}%` }} />
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
```

- [ ] **Step 2: `InsightTooltip.jsx`**

```jsx
'use client';

import React from 'react';

// Shared Recharts tooltip: rounded, borderless, unit-formatted.
export default function InsightTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg px-3 py-2 text-xs" style={{ border: 'none' }}>
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-slate-500 tabular-nums">
          {formatter ? formatter(entry) : `${entry.name}: ${entry.value}`}
        </p>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: `VolumeProteinCard.jsx`** (small multiples on mobile, overlay on desktop)

```jsx
'use client';

import React from 'react';
import { Dumbbell } from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, BarChart, LineChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import InsightTooltip from './InsightTooltip';
import { InsightCard, EmptyCard } from './ChartStates';

const AXIS = { fontSize: 12, fill: '#94a3b8' };
const GRID = <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />;
const fmtWk = (w) => new Date(w + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function VolumeProteinCard({ data }) {
  const rows = data.weeks.map((w) => ({ ...w, label: fmtWk(w.weekStart) }));
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
            {GRID}
            <XAxis dataKey="label" hide />
            <YAxis hide />
            {tooltip}
            <Bar dataKey="volume" name="Volume" fill="#e2e8f0" radius={[6, 6, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height={110}>
          <LineChart data={rows} syncId="volpro">
            {GRID}
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS} minTickGap={30} />
            <YAxis hide />
            {tooltip}
            <Line dataKey="avgProtein" name="Protein" stroke="var(--color-protein)" strokeWidth={2.5} dot isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Desktop: combined overlay */}
      <div className="hidden md:block">
        <ResponsiveContainer width="100%" height={288}>
          <ComposedChart data={rows}>
            {GRID}
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS} minTickGap={30} />
            <YAxis yAxisId="v" hide />
            <YAxis yAxisId="p" hide orientation="right" />
            {tooltip}
            <Bar yAxisId="v" dataKey="volume" name="Volume" fill="#e2e8f0" radius={[6, 6, 0, 0]} maxBarSize={28} isAnimationActive={false} />
            <Line yAxisId="p" dataKey="avgProtein" name="Protein" stroke="var(--color-protein)" strokeWidth={2.5} dot isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-2 text-xs font-semibold">
        <span className="flex items-center gap-1.5 text-slate-500"><span className="w-3 h-3 rounded bg-slate-200 inline-block" />Weekly volume (lb)</span>
        <span className="flex items-center gap-1.5 text-protein-strong"><span className="w-3 h-1 rounded bg-protein inline-block" />Avg protein (g/day)</span>
      </div>
    </InsightCard>
  );
}
```

- [ ] **Step 4: `PrTimelineCard.jsx`** (calorie line + PR dots + accessible list)

```jsx
'use client';

import React from 'react';
import { Trophy } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot } from 'recharts';
import InsightTooltip from './InsightTooltip';
import { InsightCard, EmptyCard } from './ChartStates';

const AXIS = { fontSize: 12, fill: '#94a3b8' };
const fmtDay = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function PrTimelineCard({ data }) {
  // Build a daily calorie series from weightSeries days + PR days (both carry day nutrition)
  const dayMap = {};
  data.weightSeries.forEach((s) => { dayMap[s.date] = { date: s.date, calories: s.balance != null ? s.balance + data.dailyGoal : null }; });
  data.prEvents.forEach((p) => { if (p.dayCalories != null) dayMap[p.date] = { date: p.date, calories: p.dayCalories }; });
  const series = Object.values(dayMap).filter((d) => d.calories != null).sort((a, b) => a.date.localeCompare(b.date));

  if (!data.prEvents.length) {
    return <EmptyCard title="PRs & Fuel" icon={Trophy} message="No PRs in this range yet — go lift!" />;
  }

  return (
    <InsightCard title="PRs & Fuel" icon={Trophy}>
      {series.length >= 2 && (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="date" tickFormatter={fmtDay} axisLine={false} tickLine={false} tick={AXIS} minTickGap={30} />
            <YAxis hide />
            <Tooltip content={<InsightTooltip formatter={(e) => `Calories: ${e.value}`} />} labelFormatter={fmtDay} />
            <Line dataKey="calories" name="Calories" stroke="#94a3b8" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            {data.prEvents.map((p) => (
              <ReferenceDot key={p.exercise + p.date} x={p.date} y={p.dayCalories ?? 0} r={6}
                fill="#f59e0b" stroke="#ffffff" strokeWidth={2} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
      {/* Accessible PR list (also the touch fallback) */}
      <ul className="mt-3 divide-y divide-slate-50">
        {[...data.prEvents].reverse().slice(0, 6).map((p) => (
          <li key={p.exercise + p.date} className="py-2.5 flex items-center justify-between text-sm">
            <div>
              <p className="font-semibold text-slate-700">{p.exercise} — <span className="tabular-nums">{p.weight}×{p.reps}</span></p>
              <p className="text-xs text-slate-400">{fmtDay(p.date)}</p>
            </div>
            <p className="text-xs text-slate-500 tabular-nums text-right">
              {p.dayProtein != null ? `${p.dayProtein}g protein` : 'no food logged'}
              {p.prevDayProtein != null && <><br />{p.prevDayProtein}g day before</>}
            </p>
          </li>
        ))}
      </ul>
    </InsightCard>
  );
}
```

- [ ] **Step 5: `WeightBalanceCard.jsx`** (weight line over diverging balance bars)

```jsx
'use client';

import React from 'react';
import { Scale } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts';
import InsightTooltip from './InsightTooltip';
import { InsightCard, EmptyCard } from './ChartStates';

const AXIS = { fontSize: 12, fill: '#94a3b8' };
const fmtDay = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function WeightBalanceCard({ data }) {
  const rows = data.weightSeries;
  if (rows.length < 2) {
    return <EmptyCard title="Weight vs Calorie Balance" icon={Scale} message="Log your weight a few more days" />;
  }
  return (
    <InsightCard title="Weight vs Calorie Balance" icon={Scale}>
      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="date" tickFormatter={fmtDay} axisLine={false} tickLine={false} tick={AXIS} minTickGap={30} />
          <YAxis yAxisId="w" domain={['dataMin - 2', 'dataMax + 2']} axisLine={false} tickLine={false} tick={AXIS} width={36} />
          <YAxis yAxisId="b" hide />
          <Tooltip content={<InsightTooltip formatter={(e) =>
            e.dataKey === 'weight' ? `Weight: ${e.value} lb` : `Balance: ${e.value > 0 ? '+' : ''}${e.value} kcal vs goal`} />}
            labelFormatter={fmtDay} />
          <ReferenceLine yAxisId="b" y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
          <Bar yAxisId="b" dataKey="balance" name="Balance" fillOpacity={0.6} isAnimationActive={false} maxBarSize={16} radius={[3, 3, 0, 0]}>
            {rows.map((r) => (
              <Cell key={r.date} fill={r.balance > 0 ? '#fb923c' : '#60a5fa'} />
            ))}
          </Bar>
          <Line yAxisId="w" dataKey="weight" name="Weight" stroke="#4f46e5" strokeWidth={2.5} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 text-xs font-semibold text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-indigo-600 inline-block" />Weight</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-400 inline-block" />Deficit</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-400 inline-block" />Surplus</span>
      </div>
    </InsightCard>
  );
}
```

- [ ] **Step 6: Container — `InsightsView.jsx`**

```jsx
'use client';

import React, { useState, useEffect } from 'react';
import { Dumbbell, Trophy, Scale } from 'lucide-react';
import { getInsights } from '@/lib/api';
import { LockedCard, SkeletonCard } from './ChartStates';
import VolumeProteinCard from './VolumeProteinCard';
import PrTimelineCard from './PrTimelineCard';
import WeightBalanceCard from './WeightBalanceCard';

const RANGES = [{ label: '4W', weeks: 4 }, { label: '8W', weeks: 8 }, { label: '12W', weeks: 12 }];
const UNLOCK_DAYS = 7;

export default function InsightsView({ user, onGoLogProtein }) {
  const [range, setRange] = useState(4);
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    getInsights(range)
      .then((d) => { if (!cancelled) { setData(d); setState('ready'); } })
      .catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, [range, user?.id]);

  const locked = state === 'ready' && data.foodDaysLogged < UNLOCK_DAYS;

  return (
    <div className="p-6 md:p-0 space-y-6 max-w-3xl mx-auto pb-20 md:pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-slate-800">Insights</h2>
        <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
          {RANGES.map((r) => (
            <button key={r.weeks} onClick={() => setRange(r.weeks)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                range === r.weeks ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {state === 'loading' && (<><SkeletonCard /><SkeletonCard /><SkeletonCard /></>)}

      {state === 'error' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 text-center">
          <p className="text-sm text-slate-500 mb-3">Couldn't load insights.</p>
          <button
            onClick={() => {
              setState('loading');
              getInsights(range).then((d) => { setData(d); setState('ready'); }).catch(() => setState('error'));
            }}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl">
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
          <VolumeProteinCard data={data} />
          <PrTimelineCard data={data} />
          <WeightBalanceCard data={data} />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Wire into `page.jsx` and move WeightTrend**

Replace the Task 5 placeholder:

```jsx
{activeTab === 'insights' && (
  <InsightsView user={user} onGoLogProtein={() => setActiveTab('home')} />
)}
```

(+ `import InsightsView from '@/components/insights/InsightsView';`)

In `Dashboard.jsx`: delete the Row-2 `<WeightTrend user={user} />` block and its import. Add `<WeightTrend user={user} />` (with its import) into `InsightsView` above `WeightBalanceCard`? **No** — WeightBalanceCard replaces it; instead keep `WeightTrend.jsx` file in place for one release but unrendered, OR delete it. Decision: render `WeightBalanceCard` only; keep `WeightTrend.jsx` on disk until Task 12 confirms nothing else imports it, then `git rm src/components/dashboard/WeightTrend.jsx` **only if** `grep -r "WeightTrend" src/` shows no remaining imports. (Its weight-logging input, if it has one, must be checked first — if WeightTrend contains the weight *entry* UI, move that input into `InsightsView` above the cards rather than deleting it.)

- [ ] **Step 8: Manual verify**

Fresh account (0 food days): three locked cards with progress "0/7", CTA jumps to Today. Seeded account (see Verification section): charts render, 4W/8W/12W switches, mobile shows stacked small multiples, desktop shows overlays, PR list readable by screen reader (VoiceOver rotor → list).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: Training x Nutrition Insights tab with locked/empty/loading states"
```

---

### Task 12: Migrate WeeklyTrend to Recharts + training-day markers

**Files:**
- Modify: `src/components/dashboard/WeeklyTrend.jsx` (full rewrite, hand-rolled divs → Recharts)
- Modify: `src/app/page.jsx` (weeklyData gains `trained` flag)

**Interfaces:**
- Consumes: `weeklyData` from `page.jsx` — extend each day object with `trained: boolean`.
- Produces: same component name/props (`<WeeklyTrend weeklyData />`).

- [ ] **Step 1: Add `trained` to `weeklyData` in `page.jsx`**

Inside the `weeklyData` useMemo day loop, add:

```jsx
const trained = workoutLogs.some((l) => new Date(l.date).toDateString() === d.toDateString());
days.push({ dayName: ..., date: d, calories: total, height: ..., trained });
```

(and add `workoutLogs` to the useMemo dependency array).

- [ ] **Step 2: Rewrite `WeeklyTrend.jsx`**

```jsx
'use client';

import React from 'react';
import { TrendingUp, Dumbbell } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts';
import InsightTooltip from '../insights/InsightTooltip';

export default function WeeklyTrend({ weeklyData, dailyGoal }) {
  const rows = weeklyData.map((d) => ({ ...d, label: d.dayName }));
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
      <h3 className="font-display text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-slate-400" />
        This Week
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
          <YAxis hide />
          <Tooltip content={<InsightTooltip formatter={(e) => `${e.value} kcal`} />} />
          {dailyGoal > 0 && <ReferenceLine y={dailyGoal} stroke="#cbd5e1" strokeDasharray="3 3" />}
          <Bar dataKey="calories" name="Calories" radius={[6, 6, 0, 0]} maxBarSize={28} isAnimationActive={false}>
            {rows.map((r) => (
              <Cell key={r.label + r.date} fill={r.calories > 0 ? '#4f46e5' : '#e2e8f0'} fillOpacity={r.calories > 0 ? 0.85 : 1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex justify-between px-2 mt-1" aria-hidden="true">
        {rows.map((r) => (
          <span key={r.label + r.date} className="w-7 flex justify-center">
            {r.trained ? <Dumbbell className="w-3 h-3 text-indigo-400" /> : <span className="w-3 h-3" />}
          </span>
        ))}
      </div>
    </div>
  );
}
```

Pass `dailyGoal` from `Dashboard.jsx`: `<WeeklyTrend weeklyData={weeklyData} dailyGoal={dailyGoal} />`. Note: the dumbbell marker row is approximate alignment under bars — verify visually and adjust the wrapper padding to match Recharts' plot margins (or render markers via a `Customized` layer if misaligned).

- [ ] **Step 3: Manual verify + cleanup**

Bars render with goal reference line; training days show a small dumbbell below the day label. Now check `grep -rn "WeightTrend" src/` — if only the unused file remains, `git rm src/components/dashboard/WeightTrend.jsx` (Task 11 Step 7 caveat about the weight-entry input applies).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: WeeklyTrend on Recharts with goal line and training-day markers"
```

---

### Task 13: Weekly AI review — backend

**Files:**
- Modify: `src/lib/prompts.js` (add `weeklyReview` prompt)
- Modify: `src/app/api/gemini/text/route.js` (add `type: 'weekly-review'`, weekly limit, content caching)
- Modify: `src/lib/api.js` (add `getWeeklyReview()`)

**Interfaces:**
- Consumes: `aggregateInsights` (Task 9), `startOfWeek` (Task 2), `user_settings.last_weekly_review` + `weekly_review_content` (Task 1), `generateGeminiContent` from `src/lib/gemini.js`.
- Produces: `POST /api/gemini/text` with `{ type: 'weekly-review' }` → `{ review: { training, fuel, win, focus }, cached: boolean }`. Client wrapper `getWeeklyReview() -> Promise<{review, cached}>`.

- [ ] **Step 1: Add the prompt to `src/lib/prompts.js`**

```js
  /**
   * Weekly cross-domain review (training + nutrition)
   * @param {Object} s - computed weekly summary stats
   */
  weeklyReview: (s) => `
    Act as a pragmatic strength coach reviewing a lifter's week.
    This week's data:
    - Training volume: ${s.volume} lb (last week: ${s.prevVolume} lb)
    - Workouts completed: ${s.sessions}
    - PRs: ${s.prList || 'none'}
    - Avg daily protein: ${s.avgProtein} g (target ${s.proteinGoal} g)
    - Avg daily calories: ${s.avgCalories} (goal ${s.dailyGoal})
    - Days with food logged: ${s.daysLogged}/7

    Return ONLY raw JSON, no markdown, in this exact shape:
    { "training": "1-2 sentences on volume/PRs trend", "fuel": "1-2 sentences on protein and calorie adherence, reference training days", "win": "one specific stat-backed highlight", "focus": "one actionable instruction for next week" }
    Be direct and specific with the numbers given. No emojis.
  `,
```

- [ ] **Step 2: Extend `src/app/api/gemini/text/route.js`**

Add imports: `import { aggregateInsights } from '@/lib/insights';` and `import { startOfWeek } from '@/lib/workoutStats';`

In the type dispatch, before the existing `else` → invalid-type branch, add a `weekly-review` branch. It ignores client-sent data entirely (server computes truth):

```js
    } else if (type === 'weekly-review') {
      // 1/week limit + cache
      const { data: fullSettings } = await supabase
        .from('user_settings')
        .select('daily_goal, protein_goal, last_weekly_review, weekly_review_content')
        .eq('user_id', user.id)
        .single();

      const thisWeek = startOfWeek(today);
      if (fullSettings?.last_weekly_review && startOfWeek(fullSettings.last_weekly_review) === thisWeek && fullSettings.weekly_review_content) {
        return NextResponse.json({ review: fullSettings.weekly_review_content, cached: true });
      }

      // Gather the last 14 days for this-week vs last-week comparison
      const since = new Date();
      since.setDate(since.getDate() - 14);
      const [foodRes, workoutRes] = await Promise.all([
        supabase.from('logs').select('date, calories, protein').eq('user_id', user.id).gte('date', since.toISOString()),
        supabase.from('workout_logs').select('date, exercise_name, sets, workout_sessions!inner(status)')
          .eq('user_id', user.id).eq('workout_sessions.status', 'completed').gte('date', since.toISOString()),
      ]);

      const agg = aggregateInsights({
        foodLogs: foodRes.data || [], workoutLogs: workoutRes.data || [],
        dailyStats: [], dailyGoal: fullSettings?.daily_goal || 2000, weeks: 2,
      });
      const [prevWk, thisWk] = agg.weeks.length === 2 ? agg.weeks : [{ volume: 0 }, agg.weeks[0] || { volume: 0, avgProtein: 0, avgCalories: 0, daysLogged: 0 }];

      if ((thisWk.daysLogged || 0) < 3 && thisWk.volume === 0) {
        return NextResponse.json({ error: 'Not enough data this week yet' }, { status: 422 });
      }

      const weekPrs = agg.prEvents.filter((p) => startOfWeek(p.date) === thisWeek);
      prompt = prompts.weeklyReview({
        volume: thisWk.volume, prevVolume: prevWk.volume,
        sessions: new Set((workoutRes.data || []).filter((l) => startOfWeek(String(l.date).slice(0, 10)) === thisWeek).map((l) => String(l.date).slice(0, 10))).size,
        prList: weekPrs.map((p) => `${p.exercise} ${p.weight}x${p.reps}`).join(', '),
        avgProtein: thisWk.avgProtein, proteinGoal: fullSettings?.protein_goal || 0,
        avgCalories: thisWk.avgCalories, dailyGoal: fullSettings?.daily_goal || 2000,
        daysLogged: thisWk.daysLogged,
      });
    }
```

After the Gemini call, handle the JSON response + persistence (inside the same branch flow — restructure the tail of the handler so `weekly-review` parses and saves while the old types keep their plain-text path):

```js
    if (type === 'weekly-review') {
      let review;
      try {
        review = JSON.parse(text.replace(/```json|```/g, '').trim());
      } catch {
        review = { training: text, fuel: '', win: '', focus: '' };
      }
      await supabase.from('user_settings')
        .update({ last_weekly_review: today, weekly_review_content: review })
        .eq('user_id', user.id);
      return NextResponse.json({ review, cached: false });
    }
```

- [ ] **Step 3: Add the client wrapper to `src/lib/api.js`**

```js
export async function getWeeklyReview() {
  const res = await fetch('/api/gemini/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'weekly-review' }),
  });
  const data = await res.json();
  if (!res.ok) { const err = new Error(data.error || 'Failed'); err.status = res.status; throw err; }
  return data;
}
```

- [ ] **Step 4: Manual verify**

Browser console (logged-in session with seeded week): `await getWeeklyReview()` via a temporary button or fetch → `{review: {training, fuel, win, focus}, cached: false}`; second call same week → `cached: true` with NO Gemini spend (check no `generateGeminiContent` log). Fresh account → 422.

- [ ] **Step 5: Commit**

```bash
git add src/lib/prompts.js src/app/api/gemini/text/route.js src/lib/api.js
git commit -m "feat: weekly-review AI type with 1/week server enforcement and content cache"
```

---

### Task 14: Weekly AI review — UI

**Files:**
- Create: `src/components/dashboard/WeeklyReviewCard.jsx`
- Modify: `src/components/Dashboard.jsx` (render card in slot 4, above WeeklyTrend)

**Interfaces:**
- Consumes: `getWeeklyReview()` (Task 13).
- Produces: self-contained card with collapsed/unread/reading states; read-state persisted in `localStorage['snapcal_review_read_' + weekStart]`.

- [ ] **Step 1: Implement `WeeklyReviewCard.jsx`**

```jsx
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Dumbbell, Beef, Trophy, Target, X } from 'lucide-react';
import { getWeeklyReview } from '@/lib/api';
import { startOfWeek } from '@/lib/workoutStats';

const SECTIONS = [
  { key: 'training', label: 'Training', icon: Dumbbell, tint: 'text-indigo-600 bg-indigo-50' },
  { key: 'fuel', label: 'Fuel', icon: Beef, tint: 'text-protein-strong bg-emerald-50' },
  { key: 'win', label: 'Win of the week', icon: Trophy, tint: 'text-amber-600 bg-amber-50' },
  { key: 'focus', label: "Next week's focus", icon: Target, tint: 'text-slate-600 bg-slate-100' },
];

export default function WeeklyReviewCard() {
  const weekStart = startOfWeek(new Date().toLocaleDateString('en-CA'));
  const readKey = 'snapcal_review_read_' + weekStart;
  const [read, setRead] = useState(false);
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState(null);
  const [state, setState] = useState('idle'); // idle | loading | ready | error | nodata

  useEffect(() => { setRead(localStorage.getItem(readKey) === '1'); }, [readKey]);

  const openReview = async () => {
    setOpen(true);
    if (review) return;
    setState('loading');
    try {
      const { review: r } = await getWeeklyReview();
      setReview(r);
      setState('ready');
      localStorage.setItem(readKey, '1');
      setRead(true);
    } catch (e) {
      setState(e.status === 422 ? 'nodata' : 'error');
    }
  };

  return (
    <>
      {read && !open ? (
        <button onClick={openReview}
          className="w-full h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2 px-4 text-sm font-semibold text-slate-500 hover:text-slate-700">
          <Sparkles className="w-4 h-4 text-purple-500" />
          Week of {weekStart} review · Read again
        </button>
      ) : (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 border-l-4 border-l-indigo-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg font-bold text-slate-800">Your Week in Review</h3>
              <p className="text-xs text-slate-400">Training + nutrition, one AI summary per week</p>
            </div>
            <button onClick={openReview}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200">
              Read review
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 sm:hidden" />
              <button onClick={() => setOpen(false)} aria-label="Close"
                className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-500"><X className="w-4 h-4" /></button>
              <h3 className="font-display text-xl font-bold text-slate-800 mb-4">Week of {weekStart}</h3>

              {state === 'loading' && (
                <div className="space-y-4">
                  {SECTIONS.map((s) => (
                    <div key={s.key} className="animate-pulse space-y-2">
                      <div className="h-3 bg-slate-100 rounded w-1/4" />
                      <div className="h-2 bg-slate-50 rounded w-full" />
                      <div className="h-2 bg-slate-50 rounded w-3/4" />
                    </div>
                  ))}
                  <p className="text-xs text-slate-400 text-center">Reviewing your week…</p>
                </div>
              )}
              {state === 'nodata' && <p className="text-sm text-slate-500">Log a few more days this week to get your review.</p>}
              {state === 'error' && (
                <div className="text-center">
                  <p className="text-sm text-slate-500 mb-3">Couldn't generate — try again.</p>
                  <button onClick={openReview} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl">Retry</button>
                </div>
              )}
              {state === 'ready' && review && (
                <div className="space-y-5">
                  {SECTIONS.map(({ key, label, icon: Icon, tint }) => review[key] ? (
                    <div key={key} className="flex gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${tint}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{label}</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{review[key]}</p>
                      </div>
                    </div>
                  ) : null)}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 2: Render in `Dashboard.jsx`**

Between Row 1 (hero/quick-protein) and the WeeklyTrend row:

```jsx
<WeeklyReviewCard />
```

(+ import). The card manages its own visibility states; no props needed.

- [ ] **Step 3: Manual verify**

Unread: accent card with Read review → sheet opens with skeleton → 4 sections render; close → collapsed 48px row; reload → still collapsed (localStorage); next Monday (or clear the key + change `last_weekly_review`) → full card returns.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: weekly AI review card with structured reading sheet"
```

---

### Task 15: Copy sweep + README repositioning

**Files:**
- Modify: `src/app/page.jsx` (action sheet title/labels if food-first copy remains)
- Modify: `src/components/landing-page/Hero.jsx` + `LandingPage.jsx` (headline copy: training-first)
- Modify: `src/app/manifest.js` (description)
- Modify: `README.md` (rewrite)

- [ ] **Step 1: Copy sweep**

Search and update food-first framing (keep changes surgical — copy only, no layout):

```bash
grep -rn -i "calorie tracker\|log a meal\|nutrition tracking" src/ README.md
```

- `manifest.js` + `layout.jsx` metadata description → "The lifting app where nutrition serves your training" (layout.jsx already done in Task 4).
- Landing hero headline → lead with training, e.g. "Train hard. Fuel right." with the scan feature as supporting copy, not the headline.
- Action sheet heading "Quick Log" is fine; confirm Log Workout is listed first (Task 5).

- [ ] **Step 2: Rewrite `README.md`**

Keep the existing "How I built it / Challenges / What I learned" sections (portfolio value), but replace the top: title/tagline "Liftly — the lifting app where nutrition serves your training"; What-it-does reordered to (1) workout tracking with PR detection, (2) Quick Protein 2-tap logging, (3) training-day-aware targets, (4) Training × Nutrition Insights, (5) weekly AI review, (6) AI food scanning as the power tool, not the headline. Update "What's next" to: adaptive TDEE coaching, FAB quick-protein mirror, wearables. Add a `docs/` pointer to the spec + codebase reference.

- [ ] **Step 3: Full verification pass (see Verification section) then commit**

```bash
git add -A
git commit -m "docs: reposition copy and README as lifter-first"
```

---

## Verification (end-to-end)

1. **Unit:** `npx jest --watchAll=false` — all suites pass (workoutStats, streak, insights, existing daily-stats).
2. **Build:** `npm run build` — clean.
3. **Seed script (manual, dev Supabase):** create a test account; insert via Studio SQL editor ~10 days of `logs` (varying protein 90–170g), 4 completed `workout_sessions` + `workout_logs` (Bench/Squat with one clear weight jump for a PR), daily `daily_stats.weight` drifting down 0.5 lb.
4. **Flows:**
   - Quick Protein: 2 taps logs; Undo removes; hero ring animates.
   - Training day: start session → pill + ring bump; Skip persists for the day; Adjust saves offset to `user_settings`.
   - Streak: workout-only day advances streak (check `user_settings` row).
   - Insights: locked below 7 food days; unlocked shows 3 cards; range toggle; mobile 375px = small multiples, desktop = overlays.
   - Weekly review: generates once, `cached: true` on re-open, 422 on empty week.
5. **A11y/motion:** OS reduced-motion → no ring/chart animation; Tab reaches ring, macro bars, chips; PR list readable without the chart.

## Out of scope (from spec)

Payments, social, wearables, native app, adaptive TDEE coaching, TypeScript, onboarding-step for offsets (Settings/pill only).

