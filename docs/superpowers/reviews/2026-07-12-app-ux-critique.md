# Liftly Full-App UX Critique — handoff

**Date:** 2026-07-12 · **Branch:** `dark-athletic-redesign` (post dark-athletic redesign + photo-hero landing) · **Reviewer:** ui-ux-pro-max-grounded critique pass

## Method

**Seen live** (dev server on :3789, Chrome headless via ephemeral `puppeteer-core`, 375×812 @2x and 1440×900 @2x — `package.json`/`package-lock.json` verified byte-identical before/after, dep pruned):
- `/` landing hero (mobile + desktop), scrolled feature/CTA sections, auth swap (sign-in + sign-up states, both breakpoints), and the standalone `/auth` route.

**Read from source** (auth-gated, no credentials): shell/nav (`src/app/page.jsx`), Today (`Dashboard.jsx` + `dashboard/*`), Train (`workout/*`), Insights (`insights/*`), `HistoryView`, `SettingsView`, `AddFood`, `OnboardingForm`, `EditFoodModal`/`ConfirmModal`, `ui/Sheet`, `ui/SegmentedControl`, `globals.css` tokens, `layout.jsx`; specs `2026-07-12-dark-athletic-redesign-design.md` and `2026-07-12-landing-photo-hero-design.md`; ledger `.superpowers/sdd/progress.md`.

**Skill records consulted:** product records *Fitness/Gym App* (Dark OLED + vibrant block, energetic accents, huge numerals) and *Calorie & Nutrition Counter* (macro color coding, progress ring); UX guideline sets §1 Accessibility (contrast, aria-labels, touch targets), §2 Touch & Interaction (44pt, disabled-state clarity), §5 Layout (safe areas, spacing rhythm), §6 Typography & Color (semantic tokens, dark-mode contrast), §8 Forms & Feedback (error placement/recovery, undo, confirmation), §9 Navigation (deep linking, back behavior, state preservation).

One screenshot artifact worth recording: full-page captures show below-fold landing sections at `opacity:0` because `whileInView` never fires without real scrolling — re-shot with scripted scroll; **not a product bug**.

## Scorecard

| Screen | Verdict | Grade |
|---|---|---|
| **Today** | Protein-first hero genuinely lands; but the calorie readout — the other half of the product — is 12px faint text at ~3.8:1, and error surfacing is console-only. | **B** |
| **Train** | Best interaction design in the app (sticky session header, prefill from history, PR flow, exemplary empty state) undermined by ~32px set-completion targets and a Finish that can fail silently. | **B−** |
| **Insights** | The reference screen: skeleton/error/locked/empty states all handled, accessible PR list fallback, disciplined chart theme. Only unit ambiguity mars it. | **A−** |
| **History** | Solid grouping and day-level actions; undefined `pt-safe` breaks the edit-session header under the iOS status bar, and copy/color drift from Today. | **B−** |
| **Settings** | A placeholder, not a screen: one button, no units, no account management, no recovery, no logout (mobile logout hides in the header). | **D** |
| **Add Food** | Capable scan→confirm→analyze flow, but two functional UX bugs (invisible camera error, unselected default meal type) and the heaviest raw-class residue. | **C+** |
| **Onboarding** | Well-validated multi-step with live macro-percent feedback; imperial-only inputs despite `weightUnit`/`heightUnit` state existing in the form. | **B−** |
| **Landing/Auth** | The duotone photo hero is the strongest visual in the product and motion discipline is real; held back by the stranded `/auth` route, zero legal footer, and no password recovery. | **B+** |

## Findings

Ordered by impact. Effort: S (<½ day), M (½–2 days), L (2+ days).

### 1. The app is imperial-only, and it doesn't tell you
**Screens:** Train, History, Insights, Onboarding · **Files:** `src/components/workout/WorkoutCard.jsx:381` (`Lbs` column header), `src/components/workout/PlateCalculator.jsx` (45/35/25 lb plates, "lbs" throughout), `src/components/HistoryView.jsx:374` (`${bestSet.weight}lbs`), `src/components/insights/VolumeProteinCard.jsx` legend "(lb)", `WeightBalanceCard.jsx` tooltip "lb", `src/components/OnboardingForm.jsx:193` ("Weight (lbs)" hardcoded label).
**What's wrong:** `OnboardingForm` carries `weightUnit`/`heightUnit` state (lines 26–29) but renders no toggle — every user is forced through lbs + ft/in, and every downstream surface hardcodes lbs. Meanwhile `InsightsView`'s WeightEntry input has no unit label at all ("0.0"), so a kg-thinking user logs `82` and the chart says "82 lb".
**Why it matters:** Per the skill's `number-formatting` guideline (locale-aware units) and the Fitness/Gym product record, unit preference is table stakes in this category; a metric lifter cannot use the plate calculator or trust a single chart. This is the single biggest addressable-market defect in the app.
**Fix:** Expose the existing unit state as an onboarding step + Settings preference; store canonical metric (already done for onboarding weight), format at render via one `formatWeight()` helper; give PlateCalculator a kg plate set (25/20/15/10/5/2.5 + 20kg bar). **Effort: L** (also listed under Bigger bets).

### 2. The most important actions can fail silently
**Screens:** Train, Today, shell · **Files:** `src/components/workout/WorkoutView.jsx:559–670` (`submitWorkout`: when `/api/workouts/finish` returns non-OK, nothing happens — no message, no retry, confirm modal already closed, user's session appears stuck); `src/app/page.jsx:146–147` (`fetchData` failure → `console.error`, stale UI, no banner); `src/app/page.jsx:252` and `WorkoutView.jsx:494` (raw `alert()` for errors); `src/components/Dashboard.jsx:58–64` (water save failure keeps optimistic value — comment admits "let's just log the error"); `Dashboard.jsx:69–77` (meal delete failure silent); `InsightsView` WeightEntry save failure silent.
**What's wrong:** A lifter finishes a 90-minute session on gym wifi, taps Finish, the POST fails — and the UI does nothing. Elsewhere errors are `alert()` dialogs (which the skill's §8 explicitly disfavors: no styling, blocks thread, no recovery path) or nothing at all.
**Why it matters:** `error-recovery` / `timeout-feedback` guidelines: error messages must state cause + recovery. The one place with real stakes (an unsaved workout) is the least protected. QuickProtein already has the right pattern (`role="status"` toast with error variant, `QuickProtein.jsx:238–254`).
**Fix:** Generalize QuickProtein's toast into a tiny shared `useToast`; on `submitWorkout` failure keep the session intact and show "Couldn't save your workout — Retry"; replace both `alert()`s; roll back the water optimistic update. **Effort: M**

### 3. In-workout touch targets are ~32px and unlabeled — in the gym context the spec optimizes for
**Screen:** Train · **File:** `src/components/workout/WorkoutCard.jsx:438–448` (set-complete button `p-1.5` + 20px icon ≈ 32px, no `aria-label`, state conveyed only by an opacity-0 check), `:454–459` (remove-set X: `p-1` + 16px icon ≈ 24px), `:350–374` (calculator / quick-finish / delete header row: `p-2` + 16px ≈ 32px, delete has no label at all), plus `MealFeed.jsx:~92` kebab and `HydrationTracker.jsx:~28–41` (eight icon-only droplet buttons, no `aria-label`, no `aria-pressed`, 36px).
**What's wrong:** The single most-tapped control in the app — marking a set done, with sweaty hands, phone at arm's length — is a 32px target. QuickProtein's stepper solved this exact problem with `before:` hit-area expansion (`QuickProtein.jsx:156–168`); WorkoutCard never got the treatment. The empty-fields state also *looks* tappable but silently no-ops (`toggleSetCompletion` early-returns) — the skill's "controls that look tappable but do nothing" anti-pattern.
**Why it matters:** §2 Touch & Interaction is CRITICAL priority: ≥44×44pt or extended hit area. The dark-athletic spec's own rationale ("gym context… favors huge numerals") applies doubly to tap targets.
**Fix:** `min-w-11 min-h-11` (or `before:-inset-*`) on set-row buttons; `aria-label`/`aria-pressed` on the check ("Mark set 2 done"); when fields are empty, `disabled` + reduced opacity, or a one-line hint. Same sweep for hydration droplets and meal kebab. **Effort: M**

### 4. Add Food: camera errors render into a pane that doesn't exist
**Screen:** Add Food · **File:** `src/components/AddFood.jsx:560` — the only `{error && …}` sits inside the right-side form column, which renders only when `mode === 'manual' || (mode === 'scan' && preview)`. Camera-permission failure (`:123`, "Camera access denied… Please use upload") and file-processing failure (`:201`) both occur in scan mode with no preview — the message is set into state and **never displayed**. The user taps "Use Camera", nothing happens, no explanation.
**Why it matters:** `error-placement` + `error-recovery`: the recovery hint ("use upload") exists in the string but the user never sees it. Camera denial is a *common* first-run event on iOS Safari.
**Fix:** Render the error inside the scan pane (below the Use Camera / Upload buttons). **Effort: S**

### 5. `pt-safe` is used but never defined — edit-session header sits under the iOS status bar
**Screen:** History · **Files:** `src/components/HistoryView.jsx:223` uses `pt-safe`; `src/app/globals.css:119–122` defines only `.pb-safe`. With `appleWebApp.statusBarStyle: 'black-translucent'` (`layout.jsx`), PWA content extends under the status bar, so the full-screen "Edit Workout" header's title and close button collide with the clock/notch.
**Why it matters:** `safe-area-awareness` (§2) — a fixed header whose close button is partially under system chrome is a trap on exactly the device class this app targets.
**Fix:** Add `.pt-safe { padding-top: env(safe-area-inset-top); }` next to `.pb-safe`. While there: `no-scrollbar` (`WorkoutView.jsx:980`, `PickerView.jsx:55`) is also undefined — either define it or delete the class. **Effort: S**

### 6. The calorie readout on Today is 12px faint text at ~3.7:1 — violating the redesign's own rule
**Screen:** Today · **File:** `src/components/dashboard/DailyProgress.jsx:42` — `{calories} / {calorieGoal} kcal` is `text-xs text-faint` (#71717A, ≈3.7:1 on `--background`). The spec's §1 table says faint is for "≥18px or non-essential only". This is the **only calorie status readout on the entire Today screen** in a calorie-tracking app; "remaining kcal" isn't shown anywhere.
**Same pattern:** `WorkoutCard.jsx:379` set-grid headers and `:346` category labels are `text-[10px] text-faint`; `PickerView` category sublabels; `WeeklyReviewCard.jsx:~47` subtitle.
**Why it matters:** `color-accessible-pairs` (4.5:1 AA for small text) — a deliberate hierarchy demotion is fine, but this crosses from "tertiary" into "illegible essential data", and it contradicts the ratified contrast table the team just shipped against.
**Fix:** Hero kcal line → `text-sm text-muted-foreground` (7.1:1), optionally add "N left" since `remaining` is already computed; audit the `<12px faint` instances and promote content-bearing ones to `muted-foreground`. **Effort: S**

### 7. Protein is emerald everywhere — except where you log food, where it's blue
**Screens:** Today, History, Edit modal · **Files:** `src/components/dashboard/MealFeed.jsx:~78` (`P:{log.protein}` in `text-deficit` — the *calorie-deficit blue*), `HistoryView.jsx:425` (same), `EditFoodModal.jsx` (protein input focus ring `focus:border-deficit`), `AddFood.jsx:535` (same). Meanwhile the hero ring, Quick Protein, Insights protein line, and landing all use `--protein` emerald as the signature color. Bonus confusion: every meal's kcal value in MealFeed is `text-ai` **purple** (`MealFeed.jsx:~88`) — the token reserved for AI features — while History renders the identical value in plain foreground.
**Why it matters:** `color-semantic` — the redesign's entire §1 accent table exists so color = meaning. Protein-as-blue next to a deficit-blue chart teaches users the wrong association; purple kcal implies AI provenance it doesn't have.
**Fix:** `text-deficit` → `text-protein-text` for P: chips and protein-input focus; MealFeed kcal → `text-foreground` (match History). **Effort: S**

### 8. `/auth` is a stranded, off-brand second front door
**Screen:** Auth · **Files:** `src/app/auth/page.jsx` renders `<AuthScreen />` standalone — flat background, no photo backdrop, no Back/escape route, non-compact paddings — verified live at both breakpoints. It looks like a different product than the photo-hero auth swap on `/`. Also verified live: between landing and auth-swap the **logo jumps from top-left to top-right** (`landing-page/LandingPage.jsx` nav vs `AuthView.jsx:15–30`), breaking spatial continuity during the very transition the spec engineered to feel seamless.
**Why it matters:** `navigation-consistency` + `back-behavior`: any OAuth redirect, bookmark, or shared link to `/auth` bypasses the flagship experience and strands the user (no way back to `/` except editing the URL).
**Fix:** Either redirect `/auth` → `/?auth=1` (renders the photo AuthView), or give the route the same `PhotoBackdrop` + top bar. Keep the logo on the left in AuthView (Back can sit beside it or become an X on the right). **Effort: M** (redirect route: S)

### 9. Seven modal implementations, one Sheet primitive
**Screens:** all · **Files:** `ui/Sheet.jsx` (Escape ✓, scroll-lock ✓, focus move/restore ✓, reduced-motion ✓) vs hand-rolled overlays: `WorkoutView.jsx:788` summary, `:839` save-template, `:878` load-template, `ConfirmModal.jsx`, `EditFoodModal.jsx`, `DailyProgress.jsx:228` goal editor, `PlateCalculator.jsx`. None of the seven support Escape; none lock body scroll; none manage focus; backdrop-click dismiss is inconsistent (EditFoodModal: no; MealFeed menu: yes). The redesign spec §4 explicitly mandated "ONE Sheet primitive unifying" the sheet surfaces.
**Why it matters:** `modal-escape` (§9) and `escape-routes` (§1); beyond a11y, the inconsistency is felt — Escape closes the AI modal but not the plate calculator two taps away. (The *Sheet's own* focus-trap deferral is ledger-known and not re-reported; this finding is about the six surfaces that never adopted Sheet's baseline behaviors at all.)
**Fix:** Migrate ConfirmModal/EditFoodModal/PlateCalculator/template modals onto `Sheet` (it already center-cards on `sm:`), or extract Sheet's Escape+scroll-lock+focus effects into a `useModalBehavior` hook the centered dialogs share. **Effort: M–L**

### 10. No URLs: back button exits the app, tab state is amnesiac
**Screen:** shell · **File:** `src/app/page.jsx:34,390–460` — five "screens" are one route with `activeTab` state. Browser/Android back from Insights exits Liftly; nothing is linkable (the weekly review, a history day, Insights); refresh always lands on Today; switching tabs unmounts views, discarding scroll position and any in-progress Add Food form (`{activeTab === 'add' && <AddFood/>}` — one mis-tap on the nav wipes a half-typed meal).
**Why it matters:** `deep-linking`, `back-stack-integrity`, `state-preservation` — all HIGH-priority nav guidelines. This is the structural ceiling on the app feeling native-quality.
**Fix:** See Bigger bets #1. **Effort: L**

### 11. No account recovery, no autofill hints, no password visibility
**Screen:** Auth · **File:** `src/components/AuthScreen.jsx` — there is no "Forgot password?" anywhere (Supabase `resetPasswordForEmail` unused); inputs lack `autocomplete` attributes (`email`, `current-password`/`new-password` — password managers guess); no show/hide toggle on password (`password-toggle` guideline); sign-up gives no password-requirement hint, so Supabase's "at least 6 characters" surfaces only as a post-submit error. Labels are placeholder-only (`input-labels`), acceptable-ish for a 2-field auth form but still a guideline miss.
**Why it matters:** A locked-out email user has literally no path back into an app holding months of training data.
**Fix:** Add reset flow (one Supabase call + email screen), `autocomplete` attrs (S), eye toggle (S), helper text under password on the register state (S). **Effort: M total**

### 12. Default meal type is `'snack'` but the chips only know `'Snack'`
**Screen:** Add Food · **File:** `src/components/AddFood.jsx:28` (`mealType: 'snack'`) vs `:487` (`['Breakfast','Lunch','Dinner','Snack']`, highlight test `form.mealType === type`). On open, **no meal-type chip appears selected**, and an untouched save stores lowercase `'snack'` while a tapped chip stores `'Snack'` — inconsistent data (QuickProtein also writes `'snack'`).
**Fix:** Use lowercase values with capitalized labels. **Effort: S**

### 13. Deleting a meal from Today is instant and irreversible; from History it asks first
**Screens:** Today vs History · **Files:** `Dashboard.jsx:69–77` + `MealFeed.jsx:~116` (menu → Delete → gone; no confirm, no undo) vs `HistoryView.jsx:25–61` (ConfirmModal). QuickProtein logs get an Undo toast; scanned meals get nothing.
**Why it matters:** `confirmation-dialogs`/`undo-support` — same object, three different destruction contracts depending on which screen you're standing on.
**Fix:** Cheapest consistent option: reuse the QuickProtein Undo-toast pattern for MealFeed deletes (no modal friction, gym-friendly). **Effort: S–M**

### 14. PickerView: a failed exercise fetch is an infinite spinner; an empty search is a blank void
**Screen:** Train → Add Exercise · **File:** `src/components/workout/PickerView.jsx:9` (`const loading = exercises.length === 0` — conflates "loading", "failed" (`WorkoutView.fetchExercises` catch just logs), and "genuinely empty") and the list render has no "No exercises match" state for a fruitless search.
**Why it matters:** `empty-states` + `error-state` guidelines; a first-session user with a flaky connection sees a spinner forever on the app's core flow.
**Fix:** Pass an explicit `loading`/`error` prop from WorkoutView (retry button on error); add a search empty-state row. Also: the per-row `+` affordance is `opacity-0 group-hover:opacity-100` — invisible on touch (`hover-vs-tap`); show it at rest on coarse pointers. **Effort: S**

### 15. Token discipline is already eroding: 27 raw `indigo-600` fills + a surviving decorative glow
**Screens:** all · **Files:** 19 files carry raw `bg-indigo-600 hover:bg-indigo-700` (e.g. `Dashboard.jsx:236`, `DailyProgress.jsx:176,251`, `WeeklyReviewCard.jsx:~60`, `WorkoutView.jsx:861,991`, `PickerView.jsx`, `AddFood.jsx` ×5, `OnboardingForm.jsx` ×8, `InsightsView.jsx` ×2, `ConfirmModal.jsx`, `EditFoodModal.jsx`, plus every logo tile with hardcoded `#EBE9E4` SVG fills). `PlateCalculator.jsx:~66` still ships two `blur-3xl` colored glow divs — the exact "colored glow" the spec's "Zero shadows" rule deleted everywhere else.
**Why it matters:** Visually identical today (indigo-600 == `--training`), but the spec's contract was "after the sweep, theme changes never touch components" — the parked light theme and any future brand shift now silently break in 19 files. The glow is a straight spec violation that survived four review rounds.
**Fix:** Mechanical `bg-indigo-600→bg-training` / `hover:bg-indigo-700→hover:bg-training/90` sweep + delete the two glow divs; consider a `<Logo />` component to de-duplicate the 6 inline SVG copies. **Effort: S–M**

### 16. Landing has no footer — no privacy policy, terms, or attribution anchor
**Screen:** Landing · **File:** `src/components/landing-page/sections.jsx` — the page ends at the CTA band (verified live). An app that collects health/body data and offers Google OAuth links to zero legal surface; Google's OAuth verification requires a reachable privacy policy on the homepage.
**Fix:** Minimal footer: logo, © line, Privacy, Terms (even as placeholder routes). **Effort: S**

### 17. Session timer re-renders the whole exercise list every second
**Screen:** Train · **File:** `src/components/workout/WorkoutView.jsx:69–104` — `setElapsedTime` ticks state at the top of the view once per second for the entire session; every `WorkoutCard` (with its inputs) re-renders on each tick, including mid-typing.
**Why it matters:** `input-latency` / `main-thread-budget` — on a mid-tier Android after 8 exercises this is real jank in the exact moment (entering a weight between sets) the app must feel instant.
**Fix:** Extract the timer readout into its own `<SessionTimer startTime>` component holding the interval; parent keeps only start time. **Effort: S–M**

### 18. Copy voice drifts across screens
**Screens:** all · Examples: `WeeklyReviewCard.jsx:~47,~67` renders raw ISO dates in user copy ("Week of 2026-07-06 review · Read again"); units render as `kcal` (MealFeed), `cal` (HistoryView:268,435), `Calories` (HistoryView:389); quota notation is `(1/1)`→`(0/1)` on Today's AI buttons (`DailyProgress.jsx:271,283` — "remaining/total", genuinely ambiguous) but `Scan Limit (5/5)` + "(4 left)" in AddFood; Hydration counts "Bottles" while the code models glasses (`HydrationTracker.jsx:~48`, plus a block of abandoned reasoning comments worth deleting); the Train screen titles itself "Lifting Log" while nav says "Train" (`WorkoutView.jsx:965`); ConfirmModal's default confirm label is "Delete" even for non-destructive uses.
**Why it matters:** Individually trivial; together they read as three different authors. The athletic voice the landing establishes ("Stop guessing. Start fueling.") deserves matching in-app copy.
**Fix:** 30-minute copy pass with three rules: human dates ("Week of Jul 6"), one unit word (`kcal`), one quota format ("3 of 5 left"). **Effort: S**

### 19. Dead components still shipping intent-confusion
**Files:** `src/components/Header.jsx` (unused — page.jsx has its own inline header; shows a "Syncing/Offline" status pill that exists nowhere in the real app) and `src/components/ui/hero-section-2.jsx` (the pre-photo-redo 21st.dev hero base, no importers). Also `Sidebar.jsx:5` imports `useState` unused.
**Fix:** Delete both files. **Effort: S**

### 20. Minor a11y/polish collection
- Mobile header Settings/Sign-Out and MealFeed kebab are icon-only with `title` but no `aria-label` (`page.jsx:370–384`, `MealFeed.jsx:~92`).
- Goal-edit overlay input (`DailyProgress.jsx:237–245`) has no label/aria-label and `parseInt('')→NaN` is submittable (`handleSaveGoal:129–137`) — disable Save on invalid.
- Sheet's drag-handle pill (`Sheet.jsx:~64`) affords swipe-to-dismiss that isn't implemented (`swipe-clarity`).
- Onboarding gender step offers only male/female with no "prefer to self-describe / skip" despite BMR being estimable either way (`OnboardingForm.jsx:161–174`).
- WeeklyTrend's trained-day dumbbell row is `aria-hidden` with no textual equivalent for screen readers (`WeeklyTrend.jsx:~91`).
- CTA band on mobile: left-aligned headline + center-aligned button reads slightly off-grid (`sections.jsx:44–56`, seen live).
**Effort: S each**

## Systemic observations

- **Spacing rhythm: genuinely disciplined.** 4/8 scale holds (`p-5/p-6` cards, `gap-2/3/6`, `space-y-6` sections, uniform `rounded-2xl` + hairline borders). The zero-shadow surface-step depth system works; only PlateCalculator's glow violates it.
- **Type hierarchy: the Condensed-stat system lands, but the bottom rung is abused.** Barlow Condensed tabular stats are consistently applied (hero numeral, timer, summary tiles, kcal values). The failure mode is `text-faint` at 10–12px carrying real content (Finding 6) — the token designed for tertiary decoration became the default "small text" class.
- **Empty states: split personality.** Train's empty state (icon + headline + two CTAs) and Insights' locked cards (ghost sparkline + progress-to-unlock + CTA) are excellent, skill-textbook work. MealFeed ("No meals logged today yet." — no action), PickerView (blank list), and History (icon + line, no CTA) didn't get the same care.
- **Error surfacing is the weakest system-wide layer.** The hierarchy is: QuickProtein (toast + undo, correct) → Insights/WeeklyReview (inline retry, correct) → AddFood (state that sometimes renders) → shell/Train/water (console.error black holes or `alert()`). Two screens prove the team knows the pattern; it needs promotion to infrastructure (Finding 2).
- **A11y posture: strong skeleton, unfinished extremities.** Real investments exist — DualRing's center is a labeled button, SegmentedControl is a proper roving-tabindex radiogroup, Sheet moves/restores focus, PR chart ships an accessible list fallback, reduced-motion is respected everywhere including confetti. But icon-only buttons without labels and sub-44px targets are pervasive in the row-level UI (Findings 3, 20), and nothing announces async results outside QuickProtein.
- **Cross-screen consistency is where the redesign's four review rounds show their seams:** same entity, different treatment (meal kcal purple vs plain; delete with/without confirm; protein blue vs emerald; `cal` vs `kcal`; Escape works in Sheet-based modals only). Each screen is internally coherent; the pairs disagree.
- **Token system: right architecture, enforcement gap.** The semantic layer in `globals.css` is well-designed (role-named accents, parked light theme). 27 raw indigo fills and hardcoded logo hexes mean the "components never change on retheme" contract is already broken — worth a lint rule (`no-restricted-syntax` on `indigo-600|slate-|bg-white`) before drift compounds.

## Quick wins (top 5)

1. **Move the AddFood error into the scan pane + fix `'snack'`/`'Snack'` casing** — two functional bugs, one file, ~20 lines (`AddFood.jsx:560, :28,487`). **S**
2. **Define `.pt-safe`** in `globals.css` (and define-or-delete `no-scrollbar`) — un-breaks the History edit header under the iOS status bar. **S**
3. **Retokenize protein-blue → `text-protein-text` and de-purple MealFeed kcal** — restores the semantic color system where users look most (`MealFeed.jsx`, `HistoryView.jsx:425`, `EditFoodModal.jsx`, `AddFood.jsx:535`). **S**
4. **Promote the hero kcal readout** to `text-sm text-muted-foreground` and append remaining kcal (`DailyProgress.jsx:42`). **S**
5. **`bg-indigo-600 → bg-training` mechanical sweep + delete PlateCalculator glows** — closes the spec's token contract in one grep-driven commit. **S**

## Bigger bets

1. **Real routes.** Move tabs to URL segments (`/today`, `/train`, `/insights`, `/history`, `/add`) via the App Router — fixes back-button exit, refresh amnesia, scroll/state loss, and unlocks deep links (weekly review share, PR permalinks) plus per-route code-splitting that the ledger's LCP follow-up wants anyway. One migration addresses Finding 10, the AddFood draft-loss, *and* the known `/`-bundle problem — three birds, one spec.
2. **Unit system (kg/lb) end-to-end.** Onboarding toggle (state already exists) → Settings preference → single `formatWeight/parseWeight` helper → kg plate set in the calculator. Without it, the product's addressable market is structurally halved; with it, Insights' unit ambiguity disappears too.
3. **Make Settings a screen.** It's the natural home for everything this critique surfaced that has nowhere to live: units, protein presets (currently localStorage-only, silently lost across devices — `QuickProtein.jsx:31–45`), account management + password reset, data export, sign-out, and eventually the parked light theme. Today it's one button and 90% empty space; it should be the app's trust anchor.

## Explicitly NOT flagged (ledger-known, encountered, and skipped)

- **LCP / `/`-route bundle** (356kB vs 199kB; code-split deferred to owner) — encountered while shooting the landing; not re-reported (though Bigger bet #1 would subsume the fix).
- **Sheet + training-bump popover focus traps** (R11/R14 deferral) — Finding 9 deliberately scopes to the *other six* modals' missing baseline behaviors, not the trap itself.
- **Auth toggle-link color** (spec `protein-text` vs shipped `training-text`, pending ratification) — visible in live auth shots; skipped.
- **Editable completed sets** (owner-ratified 2026-07-12) — observed in `WorkoutCard`; by design.
- **No `aria-current` on active nav** (Task 5, "pre-existing pattern") and **streak chip lacking `tabular-nums`** (Task 6) — in the ledger's final-review minors.
- **Quick Log sheet title left-aligned** and **AI-modal width delta** (R9 accepted deviations).
- **QuickProtein toast dismiss-button contrast** (R11 deferred).
- **CountUp static on first mount** (R6 design sign-off).
- **`hover:bg-training-soft-border` no-op-ish hover approximations** from the R2/R3 accepted-interim list.
