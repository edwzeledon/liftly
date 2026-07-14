# Liftly: Settings, Units & Landing-Bundle Diet — Design Spec

**Date:** 2026-07-13
**Status:** Approved
**Branch:** `dark-athletic-redesign`
**Source:** UX critique finding 1 (units end-to-end) + the Settings-as-a-screen parked bet ([`../reviews/2026-07-12-app-ux-critique.md`](../reviews/2026-07-12-app-ux-critique.md)) + the landing-bundle follow-up logged at the close of the routes migration (ledger: "/ bundle 356→217kB, target 120 missed — supabase+framer shared chunk").

## Context

Every weight in the app is hardcoded imperial: workout set inputs are unit-less numbers implicitly treated as lb, PlateCalculator assumes a 45 lb bar, Insights charts and HistoryView label "lb"/"lbs". Onboarding already collects kg/lbs but the choice dies after BMR normalization. Meanwhile `SettingsView.jsx` is a 34-line placeholder (one Retake Assessment button) with no home for any preference. This spec builds both together — the unit toggle needs Settings, Settings needs content — and folds in the one-task landing-bundle diet.

**Owner decisions (2026-07-13):** one spec for all three; workout weights stay canonical lb in storage with conversion at input/display boundaries only (zero migration); Settings ships the "core four" sections including a hydration-goal preference.

## 1. Unit preference plumbing

- Supabase migration (CLI already linked): `user_settings` gains `weight_unit text not null default 'lb'` (check constraint: `'lb'` or `'kg'`) and `water_goal integer not null default 8`.
- `src/app/api/user/settings/route.js` manual-updates block gains passthroughs: `if (body.weightUnit) updates.weight_unit = body.weightUnit === 'kg' ? 'kg' : 'lb';` and `if (body.waterGoal !== undefined) updates.water_goal = Math.min(16, Math.max(4, parseInt(body.waterGoal) || 8));`.
- `AppProvider` exposes `weightUnit` (default `'lb'`) and `waterGoal` (default `8`) through `useApp()`, read from fetched settings; the existing wholesale `snapcal_settings` localStorage cache carries them with no extra cache code.
- `OnboardingForm` seeds the preference: its existing `weightUnit` state (`'lbs'`/`'kg'`) maps to `'lb'`/`'kg'` and is sent with the profile submit. Its body-metric normalization to kg/cm for the BMR API is untouched.

## 2. `src/lib/units.js` (pure, Jest-tested)

- `LB_PER_KG = 2.2046226218`.
- `toDisplay(lb, unit)` → number: lb passthrough (as stored); kg = `Math.round((lb / LB_PER_KG) * 10) / 10` (1 decimal).
- `toLb(value, unit)` → number: lb passthrough; kg = `value * LB_PER_KG` (full precision stored — display rounding only happens on the way out).
- `formatWeight(lb, unit)` → string: `"225 lb"` / `"102.5 kg"`.
- Plate math constants: `BARS = { lb: 45, kg: 20 }`; `PLATES = { lb: [45, 35, 25, 10, 5, 2.5], kg: [25, 20, 15, 10, 5, 2.5, 1.25] }`.
- Tests: conversions both ways, rounding, round-trip stability (enter 102.5 kg → `toLb` → `toDisplay` returns 102.5), formatting, and that plate sets/bars match the constants above.

## 3. Adoption sweep (display/input boundaries only)

- **WorkoutCard:** weight inputs display `toDisplay(set.weight, unit)` and save `toLb(entered, unit)`; the weight column header / input suffix shows the unit word. `isNewRecord`, previous-set copying, and all PR/volume math stay in the lb domain unchanged.
- **PlateCalculator:** unit-aware bar and plate set from `units.js`; result labels and target input in the active unit.
- **Insights:** `VolumeProteinCard` ("Weekly volume (lb)" legend + tooltip) and `WeightBalanceCard` (weight tooltip) label and convert per preference; chart values converted before render so axes match tooltips.
- **HistoryView:** the "lbs" literal converts and relabels.
- **Insights body-weight entry:** input placeholder shows the active unit; entered value saved as lb via `toLb` (body-weight rows are canonical lb, same rule as sets).
- **SessionTimer/summary and any other weight renders found in the sweep** adopt `formatWeight`. No component keeps a hardcoded unit string.

## 4. Settings screen (core four)

`SettingsView.jsx` rebuilt as a scrolling sectioned screen (existing card/token idiom, 44px controls):

1. **Profile & Goals** — read-only summary of daily calorie goal + protein/carbs/fats targets (from `useApp()`), plus the existing Retake Assessment button (unchanged handler → onboarding modal flow).
2. **Preferences** — weight unit via the existing `SegmentedControl` (lb / kg); hydration goal stepper (− / value / +, range 4–16 glasses). Each change POSTs to the settings API then refetches (established pattern); failure → error toast via the shared `useToast` and the control reverts.
3. **Account** — signed-in email (from session), Sign out button reusing the existing logout path (clears drafts, lands on `/`).
4. **About** — app name + Privacy and Terms links (`/privacy`, `/terms` routes already exist).

## 5. Hydration goal wiring

`HydrationTracker` takes a `goal` prop (from `useApp().waterGoal`) instead of `Array(8)`: renders `goal` droplets and copy "N / goal Glasses". Water intake already saved per-day is unaffected; lowering the goal below current intake just shows all droplets filled.

## 6. Landing-bundle diet (one task)

- `AuthView` loads via `next/dynamic` (client-only, lightweight loading state) so the supabase-js chunk leaves the initial `/` payload and loads when the auth card opens (`?auth=1` still works — the dynamic import resolves on mount).
- Landing-page Framer Motion usage migrates to `LazyMotion` with `domAnimation` features and `m.` components (hero, sections, motionVariants). No visual or motion change; reduced-motion behavior preserved.
- Record the per-route first-load table before/after. Target: `/` ≤ ~120kB; if missed again, record actuals and the remaining chunk composition honestly.

## 7. Explicitly unchanged / out of scope

Onboarding BMR math and metric normalization; PR/volume/streak libs; workout session model; height-unit preference outside onboarding; i18n/locale formatting; data export; notification preferences; app-shell visual design.

## 8. Verification

- Jest green (current 50 + `units.js` tests + settings-save behavior where practical); `npm run build` clean with the per-route first-load table in the report.
- Manual kg-user loop: onboard choosing kg → preference persists → log sets in kg (stored lb, redisplayed kg) → PlateCalculator shows 20 kg bar/kg plates → Insights + History labels in kg → toggle back to lb in Settings and confirm historical rows re-render correctly both ways.
- Hydration: change goal in Settings → Today's tracker shows the new droplet count.
- Settings: each save path exercised with a forced failure → error toast + revert; sign out works from Settings.
- Bundle: table recorded, Lighthouse on `/` re-run (perf + a11y 100 held), auth flow verified with the dynamic AuthView (open, sign in, `next` returns).
