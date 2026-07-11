# Liftly: Lifter-First Repositioning — Design Spec

**Date:** 2026-07-11
**Status:** Approved
**Companion doc:** [`../../codebase-reference.md`](../../codebase-reference.md)

## Context

Liftly is a complete Cal AI-style nutrition tracker + workout logger (Next.js 15, React 19, Supabase, Gemini). The builder's own usage revealed the wedge: the workout side gets used daily, the food side never — the two halves are "two apps sharing a login." Cal AI owns food scanning; Hevy/Strong own set logging; **nobody connects the two datasets.** Liftly already has both in one DB (`logs`, `workout_logs`, `workout_sessions`, `daily_stats.weight`).

**Goals:** portfolio piece + daily driver + potential product. **Budget:** a few weeks, one big bet.

**The bet:** reposition Liftly as *the lifting app where nutrition serves training* — protein-first logging (near-zero friction), training-day-aware targets, and a Training × Nutrition insights engine neither competitor category offers.

## Design

### 1. Protein-first quick logging (the on-ramp)
- New "Quick Protein" mode: 2-tap logging of protein-centric entries (preset chips: chicken breast, protein shake, eggs, greek yogurt; user-editable presets with per-portion protein/calories; custom amount fallback).
- Extends existing `logs` table — `method: 'quick-protein'`; calories/carbs/fats optional (0-filled or estimated).
- Reuse: `QuickAdd.jsx` pattern, `POST /api/logs` unchanged.
- Dashboard protein ring becomes the hero metric; full macro display remains but secondary.
- Full AI scan + manual logging stay as-is.

### 2. Training-day-aware targets
- `user_settings` gains `training_day_calorie_offset` (default +250) and `rest_day_calorie_offset` (default 0 — base `daily_goal` is the rest-day goal), editable in onboarding/settings.
- "Today is a training day" detected from an active/completed `workout_sessions` row today; goal rings adjust live when a workout starts.
- Streak semantics change: streak counts a day with **any** log (food OR workout). Update streak logic in `/api/logs` POST + mirror in `/api/workouts/finish`.

### 3. Training × Nutrition Insights (the centerpiece)
New "Insights" tab combining both datasets:
- **Fuel vs Performance:** weekly training volume (sum weight×reps from `workout_logs.sets`) overlaid with weekly avg protein & calories.
- **PR context:** each PR event annotated with that day's + prior day's protein/calories.
- **Body trend:** weight chart enriched with calorie-balance overlay.
- Graceful degradation: locked states ("log protein for 7 days to unlock") while food data is sparse.
- Implementation: new `/api/insights` server-side aggregation route; new `components/insights/` chart components (Recharts).

### 4. Weekly AI Review (replaces daily overview as flagship AI text feature)
- New prompt in `lib/prompts.js`: weekly review across workouts + nutrition.
- Reuse `POST /api/gemini/text` with `type: 'weekly-review'`; rate-limit 1/week via new `user_settings.last_weekly_review` date column (server-enforced, same pattern as scan limits).

### 5. Foundations (serve the above, not general refactoring)
- **Commit DB schema:** export current schema + new columns as SQL into `supabase/migrations/` (currently empty).
- **Docs:** this spec + the codebase reference live in `docs/`.
- **Targeted extraction only:** pull volume/PR calculation logic out of `WorkoutView.jsx` into `lib/workoutStats.js` so Insights reuses it. No broader refactor.
- **Tests:** jest for the new aggregation logic (`lib/workoutStats.js`, insights API) — pure functions, high value; skip UI snapshot tests.

### 6. UI/UX design (decided via ui-ux-pro-max design pass)

**Keep the existing visual language** (white `rounded-3xl shadow-sm border-slate-100` cards, indigo-600 brand, Framer Motion) — evolution, not re-skin.

- **Navigation:** bottom nav → `Today · Train · [+] · Insights · History`; Settings moves to header gear icon. Desktop sidebar: Today → Train → Insights → History → Settings (bottom-pinned); "Add Meal" leaves nav, becomes sidebar CTA opening the action sheet. FAB action sheet reordered: Log Workout first.
- **Hero card (rework `DailyProgress.jsx`):** concentric dual ring — thick emerald protein outer ring (biggest numeral on screen, count-up on log), thin slate calorie inner ring with a ghost notch at the base goal; carbs/fats demoted to slim h-2 bars. Streak chip top-right.
- **Training-day bump:** automatic — calorie ring animates +250 when a session starts, tappable "Training day +250" pill (indigo-50) offers Adjust/Skip; bonus persists rest of day after finishing. Streak copy: "Log food or train today…"; streak status = max(last_log_date, last_workout_date).
- **Quick Protein:** chip row card on Today (replaces `QuickAdd.jsx`): preset pills (Chicken 31g · Shake 25g · Eggs 19g …), tap → inline portion stepper → tap to confirm; optimistic log + 5s Undo toast; entries land as normal `logs` rows. Mirror chips into FAB sheet as fast-follow.
- **Insights layout:** single-column house cards, 4W/8W/12W segmented control (reuse `WeightTrend.jsx` pill toggle). Charts: responsive mix — aligned small multiples (shared x-axis) on mobile, combined overlays on desktop. Cards: (1) weekly volume bars vs protein line, (2) daily-calorie line with PR `ReferenceDot`s + accessible PR row list below, (3) weight line over diverging calorie-balance bars (blue-400 deficit / orange-400 surplus — colorblind-safe). Locked state: 30%-opacity decorative sparkline + lock + "Log protein 4 more days — 3/7" progress + deep-link CTA. Empty/loading/error states per existing `WeightTrend`/skeleton patterns.
- **Weekly AI Review:** persistent Today card: unread = accent-left-border card with teaser + "Read review"; read = collapsed 48px row. Reading surface: mobile bottom sheet / desktop modal with 4 structured sections (Training, Fuel, Win of the week, Next week's focus) — stat chips, not a text blob. Generates lazily on first open Monday+.
- **Visual system:** protein color blue-500 → **emerald-500** (`--color-protein` token in `globals.css` `@theme`; emerald-600 for small text, 4.5:1). **Barlow Condensed 600/700 via `next/font`** for display numerals + section headers only. `tabular-nums` on all metrics. Kill decorative blur blob in `DailyProgress.jsx`; replace 🍽️ emoji avatar in `MealFeed.jsx` with Lucide `Utensils` tile.
- **Chart system rules:** dashed `#f1f5f9` grid, no axis/tick lines, no dual y-axes (direct-label last values), max 2 series distinguished by mark type not hue, shared `<InsightTooltip>`, respect `prefers-reduced-motion`. Migrate `WeeklyTrend.jsx` to Recharts under these rules (adds training-day markers).
- **Cleanup from audit:** delete dead `src/components/BottomNav.jsx` (duplicate nav that omits Workouts); `MacroDistribution.jsx` donut retired (info → hero slim bars; ratio view → Insights); `WeightTrend.jsx` moves Dashboard → Insights; hydration demoted to compact row.

### Out of scope (YAGNI)
Payments/pricing flow, social features, wearables, native app, TDEE adaptive coaching (future layer once food data exists), TypeScript migration.

## Implementation Steps (ordered)

1. **Docs first:** this spec + codebase reference committed.
2. **Schema:** pull current Supabase schema into `supabase/migrations/` as baseline SQL; add migration for `user_settings.training_day_calorie_offset`, `rest_day_calorie_offset`, `last_weekly_review`.
3. **Extract `lib/workoutStats.js`** from `WorkoutView.jsx` (volume per session/week, PR detection) + jest tests.
4. **Visual system groundwork:** `--color-protein` (emerald) + semantic tokens in `globals.css`, Barlow Condensed via `next/font` in `layout.jsx`, `tabular-nums` sweep; delete dead `BottomNav.jsx`, fix emoji avatar, remove blur blob.
5. **Nav restructure:** bottom nav → Today/Train/+/Insights/History, Settings → header gear; sidebar reorder + Log CTA; action sheet reordered (workout first).
6. **Hero card + Quick Protein:** concentric dual-ring rework of `DailyProgress.jsx`; Quick Protein chip card replaces `QuickAdd.jsx`; carb/fat slim bars; retire `MacroDistribution.jsx` donut.
7. **Training-day targets:** detection from today's `workout_sessions`, live ring animation + "+250" pill with Adjust/Skip, offsets in settings UI; streak logic (food OR train) in `/api/logs` POST + `/api/workouts/finish`, copy fixes.
8. **Insights tab:** `/api/insights` aggregation route + `components/insights/` (3 chart cards, responsive small-multiples/overlay mix, locked/empty/loading states); move `WeightTrend` here; migrate `WeeklyTrend.jsx` to Recharts.
9. **Weekly AI review:** new prompt, `type: 'weekly-review'` in `/api/gemini/text`, 1/week enforcement, Today entry card + reading surface.
10. **Reposition surface polish:** copy sweep (training-first language), README rewrite.

Reusable pieces: `POST /api/logs` (step 6), `/api/workouts/history/best` PR logic (step 3 extraction source), `lib/gemini.js` retry wrapper + `daily_stats` rate-limit pattern (step 9), `WeightTrend.jsx` as the chart-style template (step 8).

## Verification
- `npm test` for aggregation units.
- Manual e2e: seed a week of workout + quick-protein logs against dev Supabase; confirm Insights charts render, training-day offset flips when a session starts, weekly review generates.
- UI checks: 375px and desktop passes — new nav, concentric hero ring, quick-protein 2-tap flow with Undo, Insights locked states, review bottom sheet; verify `prefers-reduced-motion` and keyboard access on ring/goal buttons.
