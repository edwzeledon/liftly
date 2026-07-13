# Liftly: UX Critique Fix Wave — Design Spec

**Date:** 2026-07-13
**Status:** Approved
**Branch:** `dark-athletic-redesign`
**Source:** [`../reviews/2026-07-12-app-ux-critique.md`](../reviews/2026-07-12-app-ux-critique.md) — this wave covers findings 2–9 and 11–20 plus the quick-wins list. Parked by owner decision (future specs): units end-to-end (finding 1), real routes incl. LCP code-split (finding 10), Settings-as-a-screen.

## Context

The full-app ui-ux-pro-max critique found systemic seams rather than isolated bugs: error black-holes beside a proven toast pattern, sub-44px controls in the gym context, seven divergent modal implementations, semantic-color drift, 27 raw indigo fills breaking the token contract, and S-effort functional bugs. This wave fixes them as six thematic tasks — each builds one capability and sweeps it everywhere — because the critique's systemic-observations section shows the failures are cross-screen patterns.

**Owner decisions (2026-07-13):** fix wave only; auth toggle link flips to `text-protein-text` (per landing spec — closes the ledger ratification); meal deletes unify on undo-toast with no confirm; workout-session deletes keep ConfirmModal.

## F1. Error-surfacing infrastructure (critique F2, F13, water rollback)

- **`src/hooks/useToast.js` + `src/components/ui/Toast.jsx`** generalized from QuickProtein's shipped pattern: `role="status"` / `aria-live="polite"`, default + error variants, optional action button (label + callback, e.g. Undo/Retry), 5s auto-dismiss with cleanup, manual dismiss clears the timer, reduced-motion-safe entry, 44px controls. Jest tests: timer expiry, action callback, dismiss-cancels-timer, unmount cleanup.
- **Adoption:** `WorkoutView.submitWorkout` failure → session state intact + error toast "Couldn't save your workout" with Retry action; replace raw `alert()`s (`page.jsx` template-limit alert, `WorkoutView.jsx` save-template alert); `Dashboard.handleUpdateWater` failure → roll back optimistic value + toast; `page.jsx fetchData` catch → dismissible "Showing cached data — retry" banner; InsightsView WeightEntry save failure → toast. QuickProtein migrates to the shared hook so exactly one toast implementation exists.
- **Meal-delete contract (pending-delete queue):** MealFeed and HistoryView *meal* deletes become optimistic-with-undo: row disappears immediately; the actual `deleteLog` call is DEFERRED and fires when the toast expires, is dismissed, is superseded by a newer delete, or the owning component unmounts (flush in effect cleanup). Undo cancels the pending delete and restores the row — the row never loses its id/date (no delete-then-recreate). Workout-session deletes keep ConfirmModal (bulk destruction warrants friction).

## F2. Touch-target & label sweep (critique F3, F20)

- 44px floor (min-h/w-11 or `before:` hit-area per QuickProtein precedent) + labels: set-complete button (`aria-label="Mark set N done"`, `aria-pressed`), remove-set X, WorkoutCard header row (calculator / quick-finish / delete + `aria-label`s), hydration droplets (+`aria-pressed`), MealFeed kebab, mobile-header gear/logout `aria-label`s.
- Empty-fields set-complete: visibly `disabled` (reduced opacity + disabled attr) instead of a silent no-op.
- Goal-edit overlay: input gets a programmatic label; Save disabled while the value parses to NaN.
- WeeklyTrend trained-day markers get an sr-only sentence ("Trained Monday, Wednesday, Friday").
- Onboarding gender step adds "Prefer not to say"; BMR then uses the midpoint constant: `10w + 6.25h − 5a − 78`.

## F3. Modal behavior unification (critique F9)

- **`src/hooks/useModalBehavior.js`** extracted from Sheet's effects: Escape→onClose (handler via ref, keyed on open), body scroll lock, focus capture → move-in → restore with `isConnected` guard. Sheet refactors onto the hook with zero behavior change.
- Adopted by the six hand-rolled overlays: ConfirmModal, EditFoodModal, PlateCalculator, DailyProgress goal editor, WorkoutView save-template / load-template / summary modals. Backdrop-click dismiss made consistent (all overlays close on scrim click).
- Sheet's drag handle becomes real: swipe-down-to-dismiss via Framer Motion `drag="y"` with offset/velocity threshold → onClose; drag disabled under reduced motion.

## F4. Token, color & copy sweep (critique F6, F7, F15, F18)

- Hero kcal readout → `text-sm text-muted-foreground` + "· N left" (uses the existing `remaining`); promote content-bearing sub-12px `text-faint` (WorkoutCard grid headers + category labels, PickerView sublabels, WeeklyReviewCard subtitle) → `text-muted-foreground`. Purely decorative faint instances stay.
- Semantic colors: `text-deficit` → `text-protein-text` on P: chips (MealFeed, HistoryView) and protein-input focus rings (EditFoodModal, AddFood); MealFeed kcal `text-ai` → `text-foreground`.
- Mechanical sweep: `bg-indigo-600`→`bg-training`, `hover:bg-indigo-700`→`hover:bg-training/90` (19 files); delete PlateCalculator's two `blur-3xl` glow divs; new `src/components/ui/Logo.jsx` (size prop) replaces the six inline logo SVG copies.
- Copy rules: human dates ("Week of Jul 6"); one unit word (`kcal`); one quota format ("N of M left"); "Lifting Log"→"Train"; Hydration copy says Glasses and stale reasoning comments deleted; ConfirmModal requires an explicit confirm label (no "Delete" default).
- Enforcement: eslint `no-restricted-syntax` (warn) flagging raw `indigo-600|indigo-700|bg-white|text-slate-|bg-slate-` under src/.

## F5. Surgical bug batch (critique F4, F5, F12, F14, F17, F19)

- AddFood: error renders inside the scan pane (below Use Camera / Upload); meal-type stored lowercase with capitalized chip labels; chip highlight matches case-insensitively (legacy rows).
- globals.css: add `.pt-safe { padding-top: env(safe-area-inset-top); }`; define `.no-scrollbar` (both vendor forms) — two components already use it.
- PickerView: explicit `loading`/`error` props from WorkoutView (error → retry button), "No exercises match" empty state, add (`+`) affordance visible at rest on coarse pointers.
- **`src/components/workout/SessionTimer.jsx`** owns the 1s interval; WorkoutView stops per-second re-renders of the card list (elapsed at finish computed from the session start timestamp, not ticked state).
- Delete dead `src/components/Header.jsx` and `src/components/ui/hero-section-2.jsx`; drop Sidebar's unused `useState` import.

## F6. Auth & landing hardening (critique F8, F11, F16 + ratification)

- `/auth` → redirect to `/?auth=1`; LandingPage reads the param (Suspense-wrapped `useSearchParams`) and opens AuthView on load. AuthView top bar: logo LEFT (continuity with landing nav), Back affordance right — kills the logo position jump.
- AuthScreen: "Forgot password?" → reset state using `supabase.auth.resetPasswordForEmail` with a check-your-email confirmation view and back-to-sign-in; `autocomplete` attributes (email, `current-password`/`new-password`, name); password show/hide toggle (44px, aria-label); "At least 6 characters" hint on register; toggle link → `text-protein-text`.
- Landing footer: Logo, © 2026 Liftly, Privacy + Terms links to `/privacy` and `/terms` (static routes, honest placeholder copy), photo attribution (Sven Mieke / Unsplash).

## Execution

Six tasks in order F1 → F3 → F2 → F4 → F5 → F6 (infra before sweeps; auth last). Provisional routing pending triage: F1 opus, F3 opus, others sonnet. Scoped final review (opus) over the wave's commits, then a critique-agent re-score of the fixed screens as the closing gate — target: no fixed screen below B.

## Verification

Per task: jest green (25 + new hook tests) and clean build. End-to-end: forced-failure toast paths (offline finish, water fail, meal delete + undo incl. unmount flush); 44px audit; Escape/scroll-lock/focus/backdrop on all seven overlays + swipe dismiss; `/auth` redirect; reset-password flow against dev Supabase; Lighthouse a11y 100 held on `/`; re-score gate.

### Out of scope
Units (kg/lb), URL routes/LCP code-split, Settings rebuild, Sheet focus trap (ledger-deferred), any new features beyond the reset-password flow.
