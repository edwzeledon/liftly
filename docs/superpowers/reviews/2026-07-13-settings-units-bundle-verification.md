# Settings / Units / Landing-Bundle Wave — Verification Report

**Date:** 2026-07-13 (verification run: 2026-07-14 UTC)
**Branch:** `dark-athletic-redesign`
**HEAD at verification:** `d162b3f706ca7a1b1e5f788e0910adf5de770b40` — "perf(landing): dynamic supabase + AuthView, LazyMotion — shrink / first-load"
**Spec:** `docs/superpowers/specs/2026-07-13-settings-units-bundle-design.md`
**Prior task reports:** `.superpowers/sdd/task-1..6-report.md`

This closes the 7-task wave (tasks 1–6 merged/reviewed individually; this is the
Step-4 verification pass per `task-7-brief.md`).

---

## Step 1 — Automated gates

### Jest

```
Test Suites: 10 passed, 10 total
Tests:       58 passed, 58 total
Snapshots:   0 total
Time:        1.149 s
```

58 = the ledger's prior 50 + the 8 new `src/lib/__tests__/units.test.js` tests
(independently re-run in isolation: `1 passed / 8 passed`). All green, no
skips.

### Build — per-route First Load JS (before/after for `/`)

BEFORE table is Task 6's Step 1 measurement (reused verbatim per controller
note, not re-derived):

```
Route (app)                                 Size  First Load JS
┌ ○ /                                    12.8 kB         217 kB
├ ○ /_not-found                             1 kB         103 kB
├ ○ /add                                 4.64 kB         205 kB
├ ○ /history                             3.97 kB         215 kB
├ ○ /insights                            10.9 kB         316 kB
├ ○ /privacy                               170 B         106 kB
├ ○ /settings                            2.28 kB         209 kB
├ ○ /terms                                 170 B         106 kB
├ ○ /today                               11.9 kB         317 kB
└ ○ /train                               7.06 kB         218 kB
+ First Load JS shared by all             102 kB
ƒ Middleware                             84.4 kB
```
(API/edge routes at a flat 102 kB omitted here for brevity — unchanged shared
baseline; full table lives in `task-6-report.md`.)

AFTER — fresh `npm run build` run for this verification pass, on current HEAD:

```
Route (app)                                 Size  First Load JS
┌ ○ /                                      11 kB         130 kB
├ ○ /_not-found                             1 kB         103 kB
├ ○ /add                                 4.65 kB         210 kB
├ ƒ /api/daily-stats                       187 B         102 kB
├ ƒ /api/exercises                         187 B         102 kB
├ ƒ /api/gemini/analyze                    187 B         102 kB
├ ƒ /api/gemini/text                       187 B         102 kB
├ ƒ /api/insights                          187 B         102 kB
├ ƒ /api/logs                              187 B         102 kB
├ ƒ /api/logs/[id]                         187 B         102 kB
├ ƒ /api/user/settings                     187 B         102 kB
├ ƒ /api/workouts/active-session           187 B         102 kB
├ ƒ /api/workouts/finish                   187 B         102 kB
├ ƒ /api/workouts/history                  187 B         102 kB
├ ƒ /api/workouts/history/best             187 B         102 kB
├ ƒ /api/workouts/history/last             187 B         102 kB
├ ƒ /api/workouts/logs                     187 B         102 kB
├ ƒ /api/workouts/logs/[id]                187 B         102 kB
├ ƒ /api/workouts/templates                187 B         102 kB
├ ƒ /api/workouts/templates/[id]           187 B         102 kB
├ ƒ /apple-icon                            187 B         102 kB
├ ƒ /auth                                  187 B         102 kB
├ ○ /history                             3.98 kB         219 kB
├ ƒ /icon                                  187 B         102 kB
├ ○ /insights                            10.9 kB         321 kB
├ ○ /manifest.webmanifest                  187 B         102 kB
├ ○ /privacy                               170 B         106 kB
├ ○ /settings                            2.29 kB         214 kB
├ ○ /terms                                 170 B         106 kB
├ ○ /today                               11.9 kB         322 kB
└ ○ /train                               7.08 kB         222 kB
+ First Load JS shared by all             102 kB
  ├ chunks/1255-ab54a41c275880be.js        46 kB
  ├ chunks/4bd1b696-100b9d70ed4e49c1.js  54.2 kB
  └ other shared chunks (total)          2.11 kB

ƒ Middleware                             84.4 kB
```

**`/` first-load: 217 kB → 130 kB (-87 kB, -40%)** — identical to Task 6's
recorded AFTER numbers, confirming tasks 1–6 (settings/units feature work
built on top of the bundle diet) introduced no regression to the landing
bundle. `/settings` (2.29 kB / 214 kB) and `/insights`/`/today`/`/train`/
`/history` sit a few kB above Task 6's numbers, consistent with the unit
plumbing and Settings-screen content added in tasks 1–5.

Build was clean: `✓ Compiled successfully`, `✓ Generating static pages
(28/28)`. Only pre-existing ESLint warnings (`exhaustive-deps` in
`AddFood.jsx`/`AppProvider.jsx`/`WorkoutCard.jsx`/`WorkoutView.jsx`,
`no-img-element` in `AddFood.jsx`/`MealFeed.jsx`) — none new, none in
settings/units files.

---

## Step 2 — Lighthouse on `/`

Command run per brief, against `npm run start` (production server, port 3000):

```
npx lighthouse http://localhost:3000/ --only-categories=performance,accessibility \
  --preset=desktop --quiet --chrome-flags="--headless" --output=json
```

Ran successfully (Lighthouse 12.8.2, headless Chrome). Results:

| Metric | Value |
|---|---|
| Performance score | **100** (1.0) |
| Accessibility score | **100** (1.0) |
| LCP | **0.8 s** (799.96 ms) |
| FCP | 0.2 s |
| Total Blocking Time | 0 ms |
| Cumulative Layout Shift | 0 |
| Speed Index | 0.4 s |

**Ledger comparison:** LCP baseline was 3.3s (routes-migration wave); current
LCP is **0.8s**, a large improvement (consistent with the 217→130 kB bundle
diet from Task 6 landing directly in the critical path). A11y holds at 100,
matching the ledger requirement. No regressions.

---

## Step 3 — Manual kg-user loop

No live Supabase credentials were available in this environment. Per the
controller's scoping, the unauthenticated surface was driven end-to-end with
headless Chrome via a scratch `puppeteer-core` install (`npx --no-save`,
confined to the session scratchpad — nothing added to the repo or lockfile)
against `npm run start`. Every line requiring a signed-in session is marked
**NEEDS OWNER** below, backed by static code-level spot-checks (grep/read),
explicitly labeled as such — not a live pass.

### Live-driven checks (unauthenticated surface)

| Check | Result |
|---|---|
| Landing (`/`) loads | PASS — title "Liftly", h1 "Train hard.Fuel right.", no console/page errors |
| `?auth=1` opens auth | PASS — auth card ("Welcome Back") visible; URL cleaned back to `/` by existing `AuthParamListener` behavior (same as Task 6) |
| `/privacy` renders | PASS — title "Privacy Policy — Liftly", real body content ("This policy is being drafted. Liftly stores your workout and nutrition logs solely to provide the service...") |
| `/terms` renders | PASS — title "Terms of Service — Liftly", real body content, same length/shape as privacy |
| App-route auth gate redirects unauthed deep link | PASS — navigating to `/train` unauthenticated: frame-navigation log shows `/train` → `/?auth=1&next=%2Ftrain` → `/` (URL cleaned by `AuthParamListener`, same pattern as `?auth=1` above); auth card is visible at rest. Code-level confirmation: `src/app/(app)/layout.jsx:43-47` (`AppShell`'s `useEffect`) issues `router.replace('/?auth=1&next=' + encodeURIComponent(pathname))` when `!loading && !user`. |
| `next` param survives URL cleanup for post-sign-in routing | Static verification: `src/components/landing-page/LandingPage.jsx` — `AuthParamListener` captures `next` into a ref (`nextRef`, line 56) **before** the URL-cleaning `replace()` runs (comment at line 35: "Capture next BEFORE the URL is cleaned below"), and the `SIGNED_IN` handler (line 75) routes to `validateNext(nextRef.current) \|\| '/today'`. Whitelist-validated against open-redirect. This confirms the plumbing is intact; the actual sign-in redirect itself is the one leg needing a live session (see checklist line 10 below). |

Screenshots and driver scripts saved under the session scratchpad
(`t7-landing.png`, `t7-auth.png`, `t7-authnext.png`) — not part of the repo,
informational only.

### Spec §8 checklist — per-line pass/fail/NEEDS OWNER

1. **Settings → unit toggle to kg persists across refresh.**
   NEEDS OWNER — requires signed-in session. Static verification: `AppProvider.jsx` exposes `weightUnit` (default `'lb'`, `useState` at line ~32) set from fetched settings (`setWeightUnit(settings.weight_unit === 'kg' ? 'kg' : 'lb')`) and from the `snapcal_settings` localStorage cache; `SettingsView.jsx`'s `SegmentedControl` reads `weightUnit` from `useApp()` and its `savePreference` handler calls `handleUpdatePreferences` → `updateUserSettings` → refetch. API route `src/app/api/user/settings/route.js:138` passthrough (`weightUnit === 'kg' ? 'kg' : 'lb'`) confirmed present and constraint-shaped.

2. **Train: kg set entry round-trips; PR logic unaffected.**
   NEEDS OWNER. Static verification: `WorkoutCard.jsx` `WeightInput` computes `toDisplay(valueLb, unit)` for display and `toLb(raw, unit)` on commit (canonical-lb round trip via `src/lib/units.js`, independently covered by the 8 passing `units.test.js` cases including the round-trip case: enter 102.5 kg → `toLb` → `toDisplay` returns 102.5). PR/volume logic (`isNewRecord`, `bestSetIndex`) reads `set.weight` directly in the lb domain, untouched by conversion — no phantom PR risk from unit conversion.

3. **PlateCalculator: 20 kg bar + kg plate set; applied total lands in kg.**
   NEEDS OWNER. Static verification: `PlateCalculator.jsx` imports `BARS, PLATES` from `units.js` and uses `BARS[unit]`/`PLATES[unit]` for the bar and rack; labels reflect the active unit throughout. (Note: the component has no separate "target input" field as the brief's wording implies — only bar-weight toggle + plate counters + computed total; this is a wording mismatch in the checklist, not a functional gap — flagging for owner awareness.)

4. **Insights: volume/weight charts in kg, legend/tooltip match; body-weight placeholder "kg", saved value re-renders.**
   NEEDS OWNER. Static verification: `VolumeProteinCard.jsx` converts via `toDisplayVolume(w.volume, unit)` before render, labels `` `Weekly volume (${unit})` ``, tooltip uses the already-converted value (axis/tooltip match by construction). `WeightBalanceCard.jsx` converts via `toDisplay(r.weight, unit)`, tooltip shows `` `Weight: ${e.value} ${unit}` ``. Body-weight entry (`InsightsView.jsx` `WeightEntry`) has placeholder text keyed to `weightUnit` and saves via `toLb(weightVal, weightUnit)`.

5. **History best-set line shows kg.**
   NEEDS OWNER. Static verification: `HistoryView.jsx` imports and uses `formatWeight(bestSet.weight, weightUnit)` — no hardcoded "lbs" literal remains (confirmed via grep).

6. **Toggle back to lb — historical rows re-render correctly both ways.**
   NEEDS OWNER — inherently requires a live toggle + re-render observation against real historical rows. Static verification only establishes that every consumer (`WorkoutCard`, `PlateCalculator`, `HistoryView`, `VolumeProteinCard`, `WeightBalanceCard`, `WeightEntry`) re-derives its display purely from `weightUnit` + canonical-lb storage on every render (no cached/frozen unit state found), so a toggle should propagate everywhere without a page reload — but this is an inference from static reads, not an observed re-render.

7. **Hydration goal 10 → Today shows 10 droplets and "N / 10 Glasses".**
   NEEDS OWNER. Static verification: `HydrationTracker.jsx` signature `({ waterIntake = 0, goal = 8, onUpdateWater })` renders `[...Array(goal)]` droplets and `"{waterIntake} / {goal} Glasses"` copy; wired end-to-end via `Dashboard.jsx` (`<HydrationTracker goal={waterGoal} .../>`) and `src/app/(app)/today/page.jsx` (`waterGoal={app.waterGoal}` from `useApp()`), and `AppProvider.jsx` defaults `waterGoal` to 8 and sets it from fetched `settings.water_goal`.

8. **Settings failure path: network offline → error toast, control reverts.**
   NEEDS OWNER — requires a live session plus a devtools-offline simulation. Static verification: `SettingsView.jsx`'s `savePreference` calls `handleUpdatePreferences`; on a thrown error it calls `showToast({..., variant: 'error'})`. The "revert" is **structural, not an explicit optimistic-rollback**: both controls read `weightUnit`/`waterGoal` directly from `useApp()` context, and `AppProvider.jsx`'s `handleUpdatePreferences` only mutates that context state after a successful API call + refetch — so on failure the context values (and hence the displayed control) never change in the first place, which satisfies "control stays on the old value" by construction rather than by a catch-block rollback. Flagging this distinction for the owner in case a stricter optimistic-update-then-rollback pattern was expected.

9. **Sign out from Settings lands on `/`.**
   NEEDS OWNER. Static verification: `SettingsView.jsx`'s Sign out button calls `handleLogout`, the same function from `AppProvider.jsx` used by the sidebar/mobile-header sign-out elsewhere in the app (clears draft, signs out, `router.replace('/')`) — consistent, single logout path, not a Settings-specific reimplementation.

10. **Landing `?auth=1&next=/train` → sign in → lands on `/train`.**
    PASS (partial, live) / NEEDS OWNER (full). Live-verified: the deep-link + redirect + auth-card-open half of this flow works exactly as designed (see the live-driven checks table above — `next=%2Ftrain` survives to the point the auth card opens). NEEDS OWNER for the actual "sign in → lands on `/train`" leg, which requires a real credentialed sign-in. Static verification of that leg: `LandingPage.jsx`'s `nextRef` capture + `SIGNED_IN` handler routing to `validateNext(nextRef.current) || '/today'`, described above, is byte-consistent with the pre-existing (already-shipped) next-param flow that Task 6's report verified was undisturbed by the dynamic-`AuthView`/LazyMotion migration.

---

## Checklist tally

- **Live PASS:** 5 (landing loads, `?auth=1` opens auth, `/privacy` renders, `/terms` renders, auth-gate redirect for unauthed deep link — plus the first half of line 10)
- **NEEDS OWNER (static verification attached):** 9 of the 10 spec §8 checklist lines (1–9), plus the second half of line 10 (sign-in landing) — all backed by code-level grep/read evidence as described above, none guessed or faked
- **FAIL:** 0

---

## Self-review / concerns

- The bundle and Lighthouse numbers are fresh, live measurements taken in this
  verification pass (not reused from Task 6) except where the brief
  explicitly said to reuse the Task 6 BEFORE table — the AFTER table was
  re-run on current HEAD and matches Task 6's numbers exactly, which is the
  expected (no-regression) outcome, not a copy-paste.
- Every NEEDS OWNER line has accompanying static evidence rather than a bare
  "couldn't test" — but static evidence is not a substitute for a live pass,
  especially for line 8 (failure/revert path) and line 6 (bidirectional
  re-render), which have real behavioral nuance (the structural-vs-optimistic
  revert distinction, and the inference-only claim about live re-render) that
  only a live session can fully settle.
- One wording mismatch flagged: the spec/checklist's "applied total lands in
  the set input" language for PlateCalculator doesn't correspond to an actual
  "target input" field in the current component — worth a quick owner glance
  to confirm this is expected drift from the checklist's phrasing rather than
  a missed requirement.
- No regressions found anywhere in the automated gates; no NEW eslint
  warnings, no new test failures, no bundle regression on `/`.
