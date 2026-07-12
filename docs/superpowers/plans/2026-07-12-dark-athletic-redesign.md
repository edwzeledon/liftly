# Dark-Athletic Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin Liftly dark-athletic (dark-only ship on theme-capable semantic tokens) plus targeted layout refresh: de-carded Today hero, flat nav dock, sticky Train header, rebuilt landing.

**Architecture:** Two invariants drive everything. (1) Components consume ONLY semantic tokens after the sweep — theme changes never touch components again. (2) Sweep commits are pixel-identical because every new token initially holds today's light value; the dark flip is then a values-only CSS change plus explicitly-visual sweeps (shadows, radius). Charts re-theme through one shared `chartTheme.js`.

**Tech Stack:** Next.js 15 (JS), Tailwind 4 (`@theme` CSS tokens), Framer Motion, Recharts 3.5, next/font (Barlow + Barlow Condensed), 21st.dev CLI (`npx 21st`), Jest 30.

**Spec:** `docs/superpowers/specs/2026-07-12-dark-athletic-redesign-design.md`

## Global Constraints

- Dark-only ship: `:root` = dark values; light values parked in `.light {}`; no toggle UI.
- **Indigo hard rule:** `#4F46E5` (`--training`) renders as FILLS ONLY (buttons, active pill, `[+]` tile, chart bars use `#6366F1`); all training-colored text/icons/lines use `--training-text #818CF8`.
- Zero `shadow-*` classes anywhere after Task 4 (scrims `bg-black/60` excepted — they're overlays, not shadows).
- Cards `rounded-2xl` after Task 4; chips/pills `rounded-full`; sheets keep `rounded-t-3xl`.
- `tabular-nums` on every numeral; stat values use `font-display` (Barlow Condensed).
- Chart rules unchanged: ≤2 series, no dual visible y-axes, mark-type differentiation, `isAnimationActive={false}`, shared `InsightTooltip`; ALL chart color constants come from `chartTheme.js` — no hex literals in chart JSX after Task 1.
- Tasks 1–3 are **pixel-identical**: any rendered visual change is a spec failure.
- Every task: `npx jest --watchAll=false` → 25/25 green, `npm run build` → clean, then commit.
- 21st.dev: implementers run `npx 21st` add ONLY for their task's listed component id; every pull restyled to semantic tokens before commit.
- JS only; match existing style; work on branch `dark-athletic-redesign`.

## The Token Map (referenced by Tasks 1–4)

Semantic tokens with their Task-1 (light, pixel-identical) and Task-4 (dark) values. Utility classes become available automatically via `@theme` (`bg-card`, `text-training-text`, `bg-training-soft`, etc.).

| Token (`@theme` name) | Task 1 light value | Task 4 dark value |
|---|---|---|
| `--color-training-text` | `#4f46e5` | `#818CF8` |
| `--color-protein-text` | `#059669` | `#34D399` |
| `--color-ai` | `#9333ea` (purple-600) | `#C084FC` |
| `--color-ai-soft` | `#faf5ff` (purple-50) | `#2A1D3A` |
| `--color-streak` | `#f97316` (orange-500) | `#FBBF24` |
| `--color-streak-soft` | `#fff7ed` (orange-50) | `#332411` |
| `--color-training-soft` | `#eef2ff` (indigo-50) | `#1E1E38` |
| `--color-training-soft-border` | `#e0e7ff` (indigo-100) | `#2D2D52` |
| `--color-protein-soft` | `#ecfdf5` (emerald-50) | `#0E2A22` |
| `--color-carb` | `#f59e0b` (amber-500) | `#F59E0B` |
| `--color-fat` | `#f43f5e` (rose-500) | `#FB7185` |
| `--color-deficit` | `#60a5fa` | `#60A5FA` |
| `--color-surplus` | `#fb923c` | `#FB923C` |
| `--color-destructive-text` | `#e11d48` (rose-600) | `#FB7185` |
| `--color-faint` | `#94a3b8` (slate-400) | `#71717A` |

Core surfaces reuse the EXISTING shadcn vars (`--background`, `--card`, `--muted`, `--border`, `--foreground`, `--muted-foreground`, `--primary`); Task 4 swaps their `:root` values to: background `#0B0B0F`, card `#15151B`, muted `#1C1C24`, border `#26262E`, foreground `#F4F4F5`, muted-foreground `#A1A1AA`, primary `#F4F4F5` / primary-foreground `#15151B`, destructive fill `#DC2626`, ring `#818CF8`, radius `0.75rem`.

## The Class Map (referenced by sweep Tasks 2–3; canonical — apply mechanically)

| Hardcoded class | Semantic replacement | Context rule |
|---|---|---|
| `bg-white` | `bg-card` | everywhere (incl. `bg-white/95` → `bg-card/95`) |
| `bg-slate-50` | `bg-background` on page/scroll canvases (`page.jsx` main/app shell); `bg-muted` on component-internal surfaces (inputs, chips, insets, toggles) | |
| `bg-slate-100` / `bg-slate-200` (hover) | `bg-muted` / `hover:bg-muted` (hover pairs collapse: `bg-slate-100 hover:bg-slate-200` → `bg-muted hover:bg-muted/80`) | |
| `bg-slate-900` / `bg-slate-800` (hover) | `bg-primary` / `hover:bg-primary/90`, with their `text-white` → `text-primary-foreground` | dark utility buttons |
| `text-slate-800` `-900` `-700` | `text-foreground` | |
| `text-slate-500` `-600` | `text-muted-foreground` | |
| `text-slate-400` | `text-muted-foreground` when it labels content; `text-faint` when decorative/tertiary (placeholder hints, disabled) | |
| `text-slate-300` | `text-faint` | |
| `border-slate-100` `-200` | `border-border` | |
| `text-indigo-600` (text/icon) | `text-training-text` | `bg-indigo-600` (fills) UNCHANGED |
| `hover:text-indigo-800`, `text-indigo-500` | `hover:text-training-text/80`, `text-training-text` | |
| `bg-indigo-50` / `border-indigo-100` | `bg-training-soft` / `border-training-soft-border` | |
| `text-purple-600` / `bg-purple-50` / purple gradients | `text-ai` / `bg-ai-soft` / solid `bg-ai` (gradients die at Task 4; during sweep keep gradient but swap endpoint colors is NOT possible pixel-identically — leave gradients untouched in sweeps, they're handled in Task 4) | |
| `text-orange-500` `-600`, `fill-orange-500` | `text-streak`, `fill-streak` | |
| `bg-orange-50` / `border-orange-100` | `bg-streak-soft` / `border-streak-soft` (add `--color-streak-soft-border: #ffedd5` light / `#4A3418` dark to Task 1 tokens) | |
| `text-emerald-*` text | `text-protein-text` | ring strokes already tokenized |
| `bg-amber-500` (carb bar) / `bg-rose-500` (fat bar) | `bg-carb` / `bg-fat` | |
| `text-rose-500` (destructive/at-risk text), `text-red-*`, `hover:bg-red-50` | `text-destructive-text`, `hover:bg-destructive/10` | |
| `stroke-slate-100` (ring tracks) | `stroke-muted` | DailyProgress DualRing track circles |
| `#334155` inner-ring stroke (DailyProgress inline) | `var(--color-ring-calorie)` — add token: light `#334155`, dark `#52525B` | |
| `shadow-*`, `hover:shadow-*` | LEAVE in place during sweeps | deleted in Task 4 |
| `rounded-3xl` | LEAVE during sweeps | becomes `rounded-2xl` in Task 4 (except `rounded-t-3xl`) |

Files NOT swept (deleted/rebuilt later, sweep skips them entirely): none — landing IS swept lightly in Task 3 (Task 10 rebuilds hero but Pricing/shell survive).

---

### Task 1: Token foundation + chartTheme (pixel-identical)

**Files:**
- Modify: `src/app/globals.css` (extend `@theme` block at top)
- Modify: `src/app/layout.jsx` (load Barlow — variable only, not applied)
- Create: `src/components/insights/chartTheme.js`
- Modify: `src/components/insights/VolumeProteinCard.jsx`, `PrTimelineCard.jsx`, `WeightBalanceCard.jsx`, `src/components/dashboard/WeeklyTrend.jsx` (import constants; delete local ones)

**Interfaces:**
- Produces: every token in the Token Map at its LIGHT value; `chartTheme.js` exports `GRID_STROKE`, `AXIS_TICK`, `REF_LINE`, `SERIES` (object), `gridProps`, consumed by all 4 chart files and re-valued in Task 4. `--font-barlow` variable available but unused.

- [ ] **Step 1: Extend the `@theme` block in globals.css**

Replace the current 4-line `@theme` block (lines 4–9) with:

```css
@theme {
  --color-protein: #10b981;
  --color-protein-strong: #059669; /* legacy alias, swept to protein-text in Tasks 2-3, removed in Task 4 */
  --color-protein-text: #059669;
  --color-protein-soft: #ecfdf5;
  --color-training: #4f46e5;
  --color-training-text: #4f46e5;
  --color-training-soft: #eef2ff;
  --color-training-soft-border: #e0e7ff;
  --color-ai: #9333ea;
  --color-ai-soft: #faf5ff;
  --color-streak: #f97316;
  --color-streak-soft: #fff7ed;
  --color-streak-soft-border: #ffedd5;
  --color-carb: #f59e0b;
  --color-fat: #f43f5e;
  --color-deficit: #60a5fa;
  --color-surplus: #fb923c;
  --color-destructive-text: #e11d48;
  --color-faint: #94a3b8;
  --color-ring-calorie: #334155;
  --font-display: var(--font-barlow-condensed), ui-sans-serif, system-ui, sans-serif;
}
```

- [ ] **Step 2: Load Barlow in layout.jsx (variable only)**

Add alongside the existing Barlow_Condensed import/instance:

```jsx
import { Barlow, Barlow_Condensed } from 'next/font/google'

const barlow = Barlow({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-barlow',
  display: 'swap',
})
```

and `<html lang="en" className={`${barlowCondensed.variable} ${barlow.variable}`}>`. Do NOT set it as the body font yet (Task 4 does) — rendering must not change.

- [ ] **Step 3: Create `src/components/insights/chartTheme.js`**

```js
// Single source for Recharts color constants. Task-4 flips these values to the
// dark set; chart JSX must contain no color hex literals.
export const GRID_STROKE = '#f1f5f9';
export const AXIS_TICK = { fontSize: 12, fill: '#94a3b8' };
export const REF_LINE = '#cbd5e1';
export const SERIES = {
  weeklyBars: '#4f46e5',
  weeklyBarsEmpty: '#e2e8f0',
  volumeBars: '#e2e8f0',
  proteinLine: 'var(--color-protein)',
  weightLine: '#4f46e5',
  deficit: '#60a5fa',
  surplus: '#fb923c',
  balanceOpacity: 0.6,
  prDot: '#f59e0b',
  prDotHalo: '#ffffff',
  caloriesContext: '#94a3b8',
};
export const gridProps = { strokeDasharray: '3 3', vertical: false, stroke: GRID_STROKE };
```

- [ ] **Step 4: Point all 4 chart files at chartTheme**

In each of `VolumeProteinCard.jsx`, `PrTimelineCard.jsx`, `WeightBalanceCard.jsx` (import path `./chartTheme`) and `WeeklyTrend.jsx` (path `../insights/chartTheme`): delete the local `AXIS`/`GRID` consts and every color hex that appears in the Task-1 `SERIES` values; replace with the imports — e.g. `<CartesianGrid {...gridProps} />`, `tick={AXIS_TICK}`, `stroke={SERIES.weightLine}`, `<Cell fill={r.balance > 0 ? SERIES.surplus : SERIES.deficit} />`, `fillOpacity={SERIES.balanceOpacity}`, `<ReferenceDot fill={SERIES.prDot} stroke={SERIES.prDotHalo} />`, WeeklyTrend `ReferenceLine stroke={REF_LINE}` and `Cell fill={r.calories > 0 ? SERIES.weeklyBars : SERIES.weeklyBarsEmpty}` (keep its existing `fillOpacity={0.85}` exactly as-is). Values are identical to what each file hardcodes today — rendering must not change.

- [ ] **Step 5: Verify + commit**

Run: `npx jest --watchAll=false` (25/25) and `npm run build` (clean).
```bash
git add -A && git commit -m "feat(redesign): token foundation and shared chartTheme (visually identical)"
```

---

### Task 2: Semantic sweep A — shell + dashboard (pixel-identical)

**Files:**
- Modify: `src/app/page.jsx`, `src/components/Sidebar.jsx`, `src/components/Header.jsx`, `src/components/Dashboard.jsx`, `src/components/dashboard/DailyProgress.jsx`, `QuickProtein.jsx`, `WeeklyTrend.jsx`, `MealFeed.jsx`, `HydrationTracker.jsx`, `WeeklyReviewCard.jsx`, `EditFoodModal.jsx`, `ConfirmModal.jsx`

**Interfaces:**
- Consumes: Task 1 tokens (light values — rendering identical).
- Produces: these files contain zero hardcoded slate/white/indigo-text/purple/orange/emerald-text/amber/rose color classes (verify with the grep in Step 2). Shadows, gradients, and radii untouched.

- [ ] **Step 1: Apply the Class Map mechanically to every listed file**

Apply the table from "The Class Map" section above, including its context rules (canvas vs inset for `bg-slate-50`; indigo fills unchanged; gradients untouched; shadows/radii untouched). Special cases in this batch:
- `DailyProgress.jsx` DualRing: track circles `stroke-slate-100` → `stroke-muted` (as `className`); inner-ring `stroke="#334155"` → `stroke="var(--color-ring-calorie)"`; notch `stroke="#cbd5e1"` → add token use `stroke="var(--color-ring-notch)"` — add `--color-ring-notch: #cbd5e1` (light) to the `@theme` block (dark value `#52525B` comes in Task 4). Numeral `text-slate-800` → `text-foreground`; `text-protein-strong` → `text-protein-text`; `focus-visible:ring-emerald-400` → `focus-visible:ring-protein`.
- `page.jsx`: root `bg-slate-50` and `<main>` `bg-slate-50` → `bg-background`; nav/header `bg-white` → `bg-card`; NavButton active `text-indigo-600` → `text-training-text`; the FAB and action-sheet button colors follow the map (`bg-indigo-600` fill stays).
- `WeeklyReviewCard.jsx`: `border-l-indigo-500` → `border-l-training-text` is WRONG (that token is text-role); use `border-l-ai` per the spec's AI banner (but that changes color!). Pixel-identical rule wins in this task: map `border-l-indigo-500` → add nothing, LEAVE IT; Task 6 restyles the banner. Purple tile gradient: leave (Task 4 flattens).
- `ConfirmModal.jsx` / `EditFoodModal.jsx`: scrims `bg-black/40` stay; whites/slates per map.

- [ ] **Step 2: Verify no stragglers in swept files**

```bash
grep -nE "bg-white|slate-[0-9]|text-indigo-[0-9]|bg-indigo-50|border-indigo-1|purple-[0-9]|orange-[0-9]|emerald-[0-9]|amber-500|rose-500" \
  src/app/page.jsx src/components/{Sidebar,Header,Dashboard,EditFoodModal,ConfirmModal}.jsx src/components/dashboard/*.jsx
```
Expected: matches ONLY for (a) `bg-indigo-600`/`from-indigo`/`to-indigo` fills + gradients, (b) `from-purple`/`to-purple` gradients, (c) `focus:ring`/`focus:border` indigo edge cases if any remain flagged for Task 4, (d) none of the plain mapped classes. Anything else = incomplete sweep.

- [ ] **Step 3: Verify + commit**

`npx jest --watchAll=false` (25/25); `npm run build`; then eyeball `npm run dev` on Today briefly — it must look EXACTLY as before.
```bash
git add -A && git commit -m "refactor(redesign): semantic class sweep A - shell and dashboard (visually identical)"
```

---

### Task 3: Semantic sweep B — workout, history, insights, forms, landing (pixel-identical)

**Files:**
- Modify: `src/components/workout/WorkoutView.jsx`, `WorkoutCard.jsx`, `PickerView.jsx`, `PlateCalculator.jsx`, `src/components/HistoryView.jsx`, `src/components/insights/InsightsView.jsx`, `ChartStates.jsx`, `InsightTooltip.jsx`, `VolumeProteinCard.jsx`, `PrTimelineCard.jsx`, `WeightBalanceCard.jsx`, `src/components/AddFood.jsx`, `OnboardingForm.jsx`, `SettingsView.jsx`, `AuthScreen.jsx`, `src/components/landing-page/LandingPage.jsx`, `Hero.jsx`, `Pricing.jsx`

**Interfaces:**
- Consumes: Task 1 tokens.
- Produces: same zero-hardcoded guarantee as Task 2 for these files. Chart JSX still hexes-free (Task 1 did that); this task handles the cards' non-chart chrome (titles, legends, locked/empty states).

- [ ] **Step 1: Apply the Class Map to every listed file**

Same table, same context rules as Task 2 (the table is canonical — reread it in the Global sections). Batch-specific notes:
- `WorkoutView.jsx` (~1,000 lines): sweep only color classes; do NOT touch logic/layout; the `font-mono text-indigo-600` timer becomes `font-mono text-training-text` (Task 7 upgrades it to font-display).
- Insights legends: `text-protein-strong` → `text-protein-text`; locked-card sparkline `stroke="#cbd5e1"` → `stroke="var(--color-ring-notch)"` (shared ghost-stroke token); `bg-protein` progress bar unchanged.
- `InsightTooltip.jsx`: `bg-white` → `bg-card`; text per map.
- Landing: sweep colors only; keep all structure/gradients/photos for Task 10.
- `AuthScreen.jsx`/`OnboardingForm.jsx`: inputs `bg-slate-50 border-slate-*` → `bg-muted border-border`; focus rings indigo → `focus:ring-ring focus:border-ring` where they're generic focus affordances.

- [ ] **Step 2: Repo-wide straggler check**

```bash
grep -rnE "bg-white|text-slate-|bg-slate-|border-slate-|text-indigo-[0-9]|bg-indigo-50" src/components src/app/page.jsx | grep -v "indigo-600\|from-\|to-\|node_modules"
```
Expected: empty (fills/gradients excepted per Task 2 Step 2 rules).

- [ ] **Step 3: Verify + commit**

`npx jest --watchAll=false`; `npm run build`; spot-check Train + Insights + landing in dev — identical rendering.
```bash
git add -A && git commit -m "refactor(redesign): semantic class sweep B - remaining surfaces (visually identical)"
```

---

### Task 4: The dark flip

**Files:**
- Modify: `src/app/globals.css` (`:root` values → dark; light parked in `.light`; `@theme` token values → dark column; dead vars removed; `color-scheme`)
- Modify: `src/app/layout.jsx` (apply Barlow body, theme-color, statusBarStyle)
- Modify: `src/components/insights/chartTheme.js` (dark constants)
- Modify: repo-wide (shadow deletion, gradient flattening, radius tightening)

**Interfaces:**
- Consumes: Tasks 1–3 (all color consumption is token-based, so this task is values + three mechanical visual sweeps).
- Produces: the shipped dark theme. `.light {}` parked with the full former light set (core surfaces AND the Task-1 light accent values as `--color-*` overrides).

- [ ] **Step 1: globals.css — dark values**

(a) In the `@theme` block: swap every token to its Task-4 dark value from the Token Map (incl. `--color-ring-calorie: #52525B`, `--color-ring-notch: #52525B`); DELETE the `--color-protein-strong` legacy alias (grep first: `grep -rn "protein-strong" src/` must be empty after Tasks 2–3).
(b) In `:root`: replace the oklch light set with (hex is fine — Tailwind 4 accepts any color space):

```css
:root {
  --radius: 0.75rem;
  --background: #0B0B0F;
  --foreground: #F4F4F5;
  --card: #15151B;
  --card-foreground: #F4F4F5;
  --popover: #1C1C24;
  --popover-foreground: #F4F4F5;
  --primary: #F4F4F5;
  --primary-foreground: #15151B;
  --secondary: #1C1C24;
  --secondary-foreground: #F4F4F5;
  --muted: #1C1C24;
  --muted-foreground: #A1A1AA;
  --accent: #1C1C24;
  --accent-foreground: #F4F4F5;
  --destructive: #DC2626;
  --border: #26262E;
  --input: #26262E;
  --ring: #818CF8;
  color-scheme: dark;
}
```

(c) Move the ENTIRE former `:root` light set into `.light { ... }` (replacing the current `.dark {}` block, which is deleted), and inside `.light` also override the accent tokens back to their Task-1 light values (`--color-training-text: #4f46e5;` etc. — the full light column). Delete `--foreground-rgb`/`--background-*-rgb`, the `prefers-color-scheme` media block, and the `@custom-variant dark` line. Keep `@theme inline`, `@layer base`, `.pb-safe` as-is. Note: `.light` chart colors will still be dark (chartTheme.js is JS, not CSS) — acceptable; `.light` is parked infrastructure, not a shipped theme.

- [ ] **Step 2: layout.jsx — apply body font + PWA meta**

```jsx
export const metadata = {
  title: 'Liftly',
  description: 'The lifting app where nutrition serves your training',
  appleWebApp: { capable: true, title: 'Liftly', statusBarStyle: 'black-translucent' },
}

export const viewport = { themeColor: '#0B0B0F' }
```

Apply Barlow as the sans default: add to the `@theme` block in globals.css `--font-sans: var(--font-barlow), ui-sans-serif, system-ui, sans-serif;` (Tailwind 4 wires `font-sans`/body from this).

- [ ] **Step 3: chartTheme.js — dark constants**

```js
export const GRID_STROKE = '#27272A';
export const AXIS_TICK = { fontSize: 12, fill: '#A1A1AA' };
export const REF_LINE = '#52525B';
export const SERIES = {
  weeklyBars: '#6366F1',        // indigo-500: 600 fails 3:1 on card
  weeklyBarsEmpty: '#26262E',
  volumeBars: '#3F3F46',
  proteinLine: 'var(--color-protein)',
  weightLine: '#818CF8',
  deficit: '#60A5FA',
  surplus: '#FB923C',
  balanceOpacity: 0.85,          // 0.6 drops below 3:1 on dark
  prDot: '#FBBF24',
  prDotHalo: '#15151B',          // halo matches card, not white
  caloriesContext: '#71717A',
};
export const gridProps = { strokeDasharray: '3 3', vertical: false, stroke: GRID_STROKE };
```

Also: WeeklyTrend's `fillOpacity={0.85}` on filled bars becomes `fillOpacity={1}` (spec: full opacity on dark).

- [ ] **Step 4: three mechanical visual sweeps (repo-wide)**

(a) **Shadows:** delete every `shadow-sm|shadow-lg|shadow-xl|shadow-2xl|hover:shadow-*` and every colored `shadow-indigo-*|shadow-slate-*` class. `grep -rn "shadow-" src/ | grep -v node_modules` afterward must return only `bg-black/60` scrim lines (none contain "shadow") — i.e. empty.
(b) **Gradients:** `bg-linear-to-br from-indigo-600 to-indigo-700` → `bg-training`; `from-purple-500 to-purple-600` → `bg-ai`; the WeeklyReviewCard `from-purple-500 to-indigo-600` tile → `bg-ai`. `grep -rn "from-\|to-\|bg-linear" src/components src/app/page.jsx` → empty (landing excepted until Task 10 — leave landing gradients).
(c) **Radius:** `rounded-3xl` → `rounded-2xl` EXCEPT `rounded-t-3xl` (sheets) and `sm:rounded-3xl` → `sm:rounded-2xl`. Scrims: raise every modal/sheet backdrop `bg-black/40` → `bg-black/60`.

- [ ] **Step 5: contrast fixups the sweeps can't catch**

- `DailyProgress.jsx` streak chip when `safe`: `bg-streak-soft border-streak-soft-border`, flame `text-streak fill-streak`, count `text-streak` (all already tokenized in Task 2 — confirm they read correctly on dark; the dark soft values are in the Token Map).
- Action-sheet tiles (`page.jsx`): `bg-training-soft border-2 border-training-soft-border` renders correctly dark (tokens flip automatically) — verify visually.
- Focus rings: `focus-visible:ring-protein` on the ring button and `focus:ring-ring` elsewhere are visible on dark (ring token is now `#818CF8`).

- [ ] **Step 6: Verify + commit**

`npx jest --watchAll=false`; `npm run build`; dev-server pass on ALL five screens at 375px: dark surfaces, readable text everywhere, no white flashes (html has `color-scheme: dark`), charts legible.
```bash
git add -A && git commit -m "feat(redesign): dark flip - tokens, chart theme, shadows, gradients, radius"
```

---

### Task 5: Nav dock + mobile header

**Files:**
- Modify: `src/app/page.jsx` (bottom `<nav>` block ~line 460–500; mobile `<header>`)

**Interfaces:**
- Consumes: dark tokens; `NavButton` component in page.jsx; `setShowActionSheet`.
- Produces: flat dock markup other tasks leave alone. First evaluate `npx 21st add 10458` in a scratch dir — if its structure doesn't beat the in-place restyle below, skip the pull (decision documented in report).

- [ ] **Step 1: Replace the nav block**

```jsx
<nav className="md:hidden absolute bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-2 flex justify-between items-center z-20 pb-safe">
  <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={Home} label="Today" />
  <NavButton active={activeTab === 'workouts'} onClick={() => setActiveTab('workouts')} icon={Dumbbell} label="Train" />

  <button
    onClick={() => setShowActionSheet(true)}
    aria-label="Quick log"
    className="w-14 h-14 rounded-2xl flex items-center justify-center bg-training text-white active:scale-95 transition-transform"
  >
    <Plus className="w-7 h-7" />
  </button>

  <NavButton active={activeTab === 'insights'} onClick={() => setActiveTab('insights')} icon={BarChart3} label="Insights" />
  <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={Calendar} label="History" />
</nav>
```

(Deletes the `-mt-12` float wrapper and the old circular FAB.) `NavButton` active class is already `text-training-text` from the sweep; idle `text-muted-foreground hover:text-foreground`.

- [ ] **Step 2: Mobile header polish**

Header is already `bg-card border-b border-border` from the sweep; confirm the logo tile (`bg-indigo-600` fill — allowed) and gear/logout buttons render with `text-muted-foreground hover:text-foreground hover:bg-muted`.

- [ ] **Step 3: Verify + commit**

Manual: 375px — dock flat, `[+]` docked (bar height ~72px total), active states correct; desktop unaffected. Jest + build.
```bash
git add -A && git commit -m "feat(redesign): flat nav dock with docked quick-log tile"
```

---

### Task 6: Today hero de-card

**Files:**
- Modify: `src/components/Dashboard.jsx` (Row 1 grid), `src/components/dashboard/DailyProgress.jsx` (de-card + 72px numeral + status row), `WeeklyReviewCard.jsx` (banner restyle)

**Interfaces:**
- Consumes: everything DailyProgress already receives — NO prop changes, NO logic changes. DualRing internals (geometry, notch invariant, mounted animation) untouched except numeral size and viewport width.
- Produces: `<DailyProgress>` renders card-less; Dashboard Row 1 becomes full-bleed hero over the grid. Animated Counter `[1844]`: pull with `npx 21st add 1844`, wrap as `src/components/dashboard/CountUp.jsx` exporting `<CountUp value className />` — must no-op (render static value) under `prefers-reduced-motion` and settle ≤400ms.

- [ ] **Step 0: Create the CountUp wrapper**

Run `npx 21st add 1844` (Animated Counter); adapt its output into `src/components/dashboard/CountUp.jsx` exporting exactly `<CountUp value className />`. Requirements: animates from previous to new value in ≤400ms ease-out; renders the static value when `window.matchMedia('(prefers-reduced-motion: reduce)').matches`; no external deps beyond what the pull brings (drop any it carries that aren't already installed — if it needs new deps, hand-roll with `requestAnimationFrame` instead). If the pull fights this contract, hand-roll (~30 lines) and document.

- [ ] **Step 1: DailyProgress restyle (structure, not logic)**

- Root div: `bg-card rounded-2xl p-6 border border-border` → `px-6 pt-2 pb-6 md:px-0` (no surface — it sits on `bg-background`).
- Consolidate header into one status row: `<div className="flex items-center justify-between mb-4">` containing (left) the training pill (existing markup, unchanged behavior) or an "Rest day" `text-faint text-xs` label when no pill renders; (right) the streak chip (existing). DELETE the "Daily Progress / Fuel your training" heading block entirely (the screen header is the app identity now); keep the at-risk streak line, moved under the status row.
- Ring: bump wrapper `w-56 h-56` → `w-64 h-64 md:w-72 md:h-72`; numeral `text-5xl` → `text-6xl md:text-7xl`, wrap value in `<CountUp value={protein} className="font-display text-6xl md:text-7xl font-black text-foreground tabular-nums leading-none" />`.
- Macro bars + "Edit calorie goal" + AI buttons: unchanged markup, now on background (AI buttons keep their `bg-training-soft`/`bg-ai-soft` chips — those are surfaces of their own).
- Edit overlay: `bg-card/95 backdrop-blur-sm` (was `bg-white/95`, already swept — confirm).

- [ ] **Step 2: Dashboard Row 1**

```jsx
{/* Row 1: full-bleed hero + quick protein (mobile stacked; desktop 2/3 + 1/3) */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">
    <DailyProgress ... {/* identical prop list as today */} />
  </div>
  <div className="flex flex-col gap-6">
    <QuickProtein user={user} onLogAdded={onLogAdded} />
  </div>
</div>
```

(The only change is DailyProgress no longer painting a card; grid stays.) On mobile the hero is edge-to-edge because Dashboard's root `p-6` padding is removed for the first row: change root to `space-y-6` with `px-6` on every row EXCEPT row 1 (which carries its own responsive padding inside DailyProgress).

- [ ] **Step 3: WeeklyReviewCard banner**

Unread card: `bg-card rounded-2xl border border-border border-l-4 border-l-ai p-4` (slimmer than p-6); tile `bg-ai` (gradient already flattened in Task 4); title stays `font-display`. Read row unchanged (`bg-card h-12`). Sheet untouched (Task 9 replaces its shell).

- [ ] **Step 4: Verify + commit**

Manual: mobile — hero edge-to-edge, 72px numeral, chips below ring in thumb reach, review banner slim; desktop — grid intact; reduced-motion → numeral static. Jest + build.
```bash
git add -A && git commit -m "feat(redesign): de-carded full-bleed Today hero with count-up numeral"
```

---

### Task 7: Train screen — sticky header + set states + summary tiles

**Files:**
- Modify: `src/components/workout/WorkoutView.jsx` (timer block ~line 915–930, Finish button, summary modal ~line 780–800), `src/components/workout/WorkoutCard.jsx` (completed-set styling)

**Interfaces:**
- Consumes: existing `elapsedTime`, `formatTime`, finish flow — logic untouched.
- Produces: sticky header pattern; Statistics Card `[4243]` pulled (`npx 21st add 4243`) and adapted into the summary modal as flat `bg-muted` tiles (or hand-rolled if the pull fights the modal — document the call).

- [ ] **Step 1: Sticky session header**

Wrap the existing active-session title/timer/Finish region in:

```jsx
<div className="sticky top-0 z-10 -mx-6 px-6 py-3 bg-background/90 backdrop-blur border-b border-border flex items-center justify-between">
  <div>
    <h2 className="font-display text-xl font-bold text-foreground">Active Session</h2>
    <p className="font-display text-2xl font-bold text-training-text tabular-nums leading-none">{formatTime(elapsedTime)}</p>
  </div>
  {/* existing Finish button, restyled: bg-training text-white font-bold rounded-xl px-5 py-2.5 active:scale-95 */}
</div>
```

(`font-mono` dies here; exact integration point is the current timer block — preserve every handler.) Exercise count if present in that block stays, as `text-muted-foreground text-xs`.

- [ ] **Step 2: Completed-set tint in WorkoutCard.jsx**

Find the completed-set row styling (currently reduces opacity — `opacity-50` or similar on the row/inputs when `set.completed`). Replace the opacity treatment with: row `bg-protein-soft`, weight/reps text `text-protein-text`, checkmark `text-protein`. Inputs stay enabled exactly as today (only classes change).

- [ ] **Step 3: Summary tiles**

In the finish-summary modal, present duration / exercises / volume as a 3-up tile row: each tile `bg-muted rounded-xl p-3 text-center`, value `font-display text-2xl font-bold tabular-nums text-foreground`, label `text-xs text-muted-foreground`. Use the `[4243]` pull as the base if its markup adapts cleanly; otherwise hand-roll exactly this.

- [ ] **Step 4: Verify + commit**

Manual: start session → header sticks under scroll with blur; complete a set → emerald tint, still editable; finish → tiles. Jest + build.
```bash
git add -A && git commit -m "feat(redesign): sticky Train session header, emerald set states, summary tiles"
```

---

### Task 8: SegmentedControl + History treatment

**Files:**
- Create: `src/components/ui/SegmentedControl.jsx`
- Modify: `src/components/insights/InsightsView.jsx` (range switcher), `src/components/HistoryView.jsx` (meals/workouts toggle + sticky date headers), `src/components/insights/ChartStates.jsx` (ghost sparkline stroke)

**Interfaces:**
- Produces: `<SegmentedControl options={[{label, value}]} value onChange size? />` — `bg-muted` track, `bg-card` active thumb, `text-foreground` active / `text-muted-foreground` idle, `rounded-xl` track + `rounded-lg` thumb, 44px min height, keyboard: radiogroup semantics (`role="radiogroup"`, options `role="radio"` `aria-checked`, arrow-key navigation). Base from Reshaped Tabs `[18328]` (`npx 21st add 18328`) if adaptable; else hand-roll to this exact contract.

- [ ] **Step 1: Build SegmentedControl (contract above is the spec)**

```jsx
'use client';
import React, { useRef } from 'react';

export default function SegmentedControl({ options, value, onChange, className = '' }) {
  const refs = useRef([]);
  const idx = options.findIndex((o) => o.value === value);
  const onKeyDown = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = e.key === 'ArrowRight' ? (idx + 1) % options.length : (idx - 1 + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" onKeyDown={onKeyDown} className={`bg-muted p-1 rounded-xl inline-flex gap-1 ${className}`}>
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => (refs.current[i] = el)}
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 min-h-9 text-xs font-bold rounded-lg transition-colors ${
            o.value === value ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Wire into InsightsView (replace the RANGES pill row) and HistoryView (replace the meals/workouts toggle), preserving state names and handlers exactly.**

- [ ] **Step 3: History sticky date headers → `bg-background/90 backdrop-blur` (find the sticky date group headers — currently a swept `bg-background` or `bg-muted`); ChartStates ghost sparkline `stroke` → `#3F3F46` literal is WRONG — it should already be `var(--color-ring-notch)` from Task 3, which is `#52525B` after Task 4; spec wants `#3F3F46` for the ghost specifically: add token `--color-ghost-sparkline: #3F3F46` (dark) / `#cbd5e1` (light, in `.light`) and use it.**

- [ ] **Step 4: Verify + commit**

Manual: arrow keys traverse both controls; History headers blur over scrolled content. Jest + build.
```bash
git add -A && git commit -m "feat(redesign): shared SegmentedControl, History blur headers"
```

---

### Task 9: Sheet primitive — unify the three overlays

**Files:**
- Create: `src/components/ui/Sheet.jsx`
- Modify: `src/app/page.jsx` (Quick Log action sheet), `src/components/dashboard/WeeklyReviewCard.jsx` (review sheet), `src/components/Dashboard.jsx` (AI modal)

**Interfaces:**
- Produces: `<Sheet open onClose title? children>` — mobile bottom sheet (`items-end`, `rounded-t-3xl`, grab handle) / desktop centered modal (`sm:items-center`, `sm:rounded-2xl sm:max-w-lg`), `bg-card`, scrim `bg-black/60 backdrop-blur-sm`, Framer Motion spring `{type:'spring', damping:25, stiffness:300}` with `motion-reduce` fallback (no transform animation), closes on scrim click + X + Escape, `role="dialog" aria-modal="true"`, body scroll locked while open (reuse the `document.body.style.overflow` pattern from DailyProgress.jsx:117-126). Base from Bottom Drawers `[6034]` (`npx 21st add 6034`) if adaptable; else hand-roll to this contract.

- [ ] **Step 1: Build Sheet.jsx per the contract (AnimatePresence inside; each consumer keeps its own trigger state).**

```jsx
'use client';
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = 'unset';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog" aria-modal="true" aria-label={title}
            initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full sm:max-w-lg bg-card rounded-t-3xl sm:rounded-2xl p-6 max-h-[85vh] overflow-y-auto motion-reduce:transition-none"
          >
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4 sm:hidden" />
            <button onClick={onClose} aria-label="Close"
              className="absolute top-4 right-4 p-2 bg-muted rounded-full text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
            {title && <h3 className="font-display text-xl font-bold text-foreground mb-4">{title}</h3>}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Migrate the three consumers** — Quick Log action sheet (`page.jsx`: keep the two tile buttons as children; delete its bespoke AnimatePresence shell), WeeklyReviewCard sheet (children = the 4-section content + skeleton/nodata/error states; delete its shell), Dashboard AI modal (children = existing confirm/result content; its `pointer-events` quirks die with the old shell). Each keeps its own open-state and handlers; no behavior change beyond the unified shell.

- [ ] **Step 3: Verify + commit**

Manual: all three overlays open/close via scrim, X, Escape; body scroll locks; mobile bottom-sheet vs desktop modal; reduced-motion = fade only. Jest + build.
```bash
git add -A && git commit -m "feat(redesign): unified Sheet primitive for action sheet, review, and AI modal"
```

---

### Task 10: Landing rework

**Files:**
- Modify: `src/components/landing-page/LandingPage.jsx`, `Hero.jsx` (rebuild), `Pricing.jsx` (restyle only)
- Create: `src/components/landing-page/DeviceFrame.jsx` (scaled dashboard render)

**Interfaces:**
- Consumes: dark tokens; auth flow (`AuthScreen` slide-in) must keep working exactly as today.
- Produces: dark hero. Base from Hero Section Dark `[19]` (`npx 21st add 19`) if adaptable. Hero art = `DeviceFrame`: a `pointer-events-none select-none` phone-frame div (`aria-hidden`, rounded-[2.5rem] border-4 border-border bg-background) containing a STATIC hand-built miniature of the Today hero (ring SVG at fixed sample values, macro bars, 2 chips) — NOT the live components (they fetch data); ~200px wide, scaled with `scale-90 md:scale-100`. Fallback to a PNG screenshot only if this fights the layout (document).

- [ ] **Step 1: Hero rebuild**

Headline block:

```jsx
<h1 className="font-display font-bold uppercase leading-[0.95] text-5xl md:text-7xl text-foreground">
  Train hard.
  <br />
  <span className="text-protein">Fuel right.</span>
</h1>
<p className="mt-4 text-lg text-muted-foreground max-w-md">
  The lifting app where nutrition serves your training. Log protein in two taps, see how fuel drives your PRs.
</p>
```

CTA row: primary `bg-training text-white font-bold rounded-xl px-6 py-3` ("Start training"), secondary `bg-muted text-foreground` ("See how it works" → scrolls to features). Right column: `<DeviceFrame />`. Remove all stock photography and any remaining gradients; feature strip = three flat tiles (`bg-card border border-border rounded-2xl p-5`, icon in `bg-training-soft`/`bg-protein-soft`/`bg-ai-soft` tile, `font-display` headings): "PR detection", "2-tap protein", "Weekly AI review".

- [ ] **Step 2: DeviceFrame.jsx** — static mini-hero per the interface note (fixed values: 118/160g ring ≈ 74%, calorie ring ≈ 82%, two chips "Chicken breast 31g" / "Shake 25g"); all decorative, `aria-hidden="true"`.

- [ ] **Step 3: Pricing** — cards `bg-card border-border rounded-2xl`, highlight tier `border-training-soft-border bg-training-soft/50`; copy untouched.

- [ ] **Step 4: Verify + commit**

Manual: logged-out view at 375px + desktop; auth slide-in still works; no gradients/photos remain (`grep -n "from-\|to-\|unsplash\|\.jpg\|\.png" src/components/landing-page/*.jsx` → empty except DeviceFrame classes). Jest + build.
```bash
git add -A && git commit -m "feat(redesign): dark athletic landing with device-frame product hero"
```

---

### Task 11: Polish + verification pass

**Files:**
- Modify: as findings dictate (small fixes only); `README.md` (tagline/screenshot note if it references light UI)

- [ ] **Step 1: Contrast audit** — dev server at 375px and desktop; walk every screen against the spec §1 table; every text-bearing pair must match its token (spot-check computed styles for: muted-foreground on card, training-text on card, protein-text on card, streak on soft, white on training fill, destructive-text on card).
- [ ] **Step 2: Reduced-motion** — OS setting on: ring fill static, CountUp static, sheets fade-only, no `animate-in` violations that matter (tw-animate classes are decorative; flag any that carry meaning).
- [ ] **Step 3: Keyboard** — Tab order through: nav dock, SegmentedControls (arrow keys), Sheet (Escape/focus), ring/bars/chips, training pill popover.
- [ ] **Step 4: Lighthouse a11y** on Today + Train (dev build ok): record scores in the report; fix anything scored as an error (not warnings) if a one-liner.
- [ ] **Step 5: `.light` sanity** — in devtools, add `class="light"` to `<html>`: surfaces/text/accents return to light values (charts stay dark — known, acceptable); remove class.
- [ ] **Step 6: Stat-numeral sweep** — spec §1 puts ALL stat values in Barlow Condensed tabular: check History calorie/volume values and MealFeed calorie values; where a numeric stat renders in body font, add `font-display font-semibold tabular-nums` (labels stay body font).
- [ ] **Step 7: README touch** — if README references the light UI or old FAB, correct the wording; no feature claims added.
- [ ] **Step 8: Final commit**

```bash
git add -A && git commit -m "chore(redesign): contrast, motion, keyboard, and a11y polish pass"
```

---

## Verification (end-to-end, after all tasks)

1. `npx jest --watchAll=false` → 25/25; `npm run build` → clean.
2. Five-screen manual pass (Today, Train, Insights, History, Landing) at 375px + desktop against spec §1/§3 tables.
3. All three Sheet consumers; SegmentedControl keyboarding; dock tap targets ≥44px.
4. Reduced-motion + `.light` devtools sanity + Lighthouse a11y ≥ previous baseline on Today/Train.

