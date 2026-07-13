# UX Fix Wave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the S/M findings from the full-app UX critique — shared toast infrastructure, 44px touch floor, unified modal behavior, semantic-color/copy repair, surgical bugs, auth hardening.

**Architecture:** Two new hooks carry the wave: `useToast` (generalized from QuickProtein, with a pending-commit queue that makes optimistic deletes undoable) and `useModalBehavior` (extracted verbatim from Sheet's effects). Everything else is adoption + sweeps.

**Tech Stack:** React 19 hooks, Framer Motion 12, Tailwind 4 tokens, Supabase auth (`resetPasswordForEmail`), Jest 30.

**Spec:** `docs/superpowers/specs/2026-07-13-ux-fix-wave-design.md` · **Critique:** `docs/superpowers/reviews/2026-07-12-app-ux-critique.md`

## Global Constraints

- Branch `dark-athletic-redesign`; JS only; every task: `npx jest --watchAll=false` green (25 + new) + `npm run build` clean + one commit.
- Repo lint: `react-hooks/set-state-in-effect` is a build ERROR (existing scoped-disable precedent in QuickProtein.jsx for localStorage hydration only).
- Token law stands: no raw palette classes in new code (`bg-training`, `text-protein-text`, `text-muted-foreground`, etc.); zero shadows; scrims exempt.
- 44px minimum on every interactive control this wave touches (`min-h-11`/`min-w-11` or `before:` hit-area per `QuickProtein.jsx` stepper precedent).
- Reduced motion: every new animation gated (useReducedMotion or `motion-reduce:`); no loops.
- Parked (do NOT drift into): units/kg, URL routes, LCP code-split, Settings rebuild, Sheet focus trap.
- Auth LOGIC (signIn/signUp/OAuth handlers) untouched except the additions named in F6.

---

### Task F1: Error-surfacing infrastructure

**Files:**
- Create: `src/hooks/useToast.js`, `src/components/ui/Toast.jsx`
- Test: `src/hooks/__tests__/useToast.test.js`
- Modify: `src/components/dashboard/QuickProtein.jsx` (migrate), `src/components/Dashboard.jsx` (water rollback, meal-delete undo, render toast), `src/components/dashboard/MealFeed.jsx` (no confirm changes needed — it calls `onDeleteLog`), `src/components/HistoryView.jsx` (meal deletes → undo path; SESSION deletes keep ConfirmModal), `src/components/workout/WorkoutView.jsx` (submitWorkout failure + alert at ~:494), `src/app/page.jsx` (alert at :252 → toast; fetchData catch → banner), `src/components/insights/InsightsView.jsx` (WeightEntry failure)

**Interfaces:**
- Produces:
  - `useToast() -> { toast, toastEl, showToast, dismissToast }` where `showToast({ message, variant = 'default'|'error', action?: {label, onAction}, onCommit?, duration = 5000 })`.
  - **Commit semantics (the pending-delete queue):** `onCommit` fires exactly once when the toast leaves WITHOUT its action being taken — on expiry, on manual dismiss, when superseded by a newer `showToast`, or on host unmount (effect-cleanup flush). Pressing the action button calls `onAction` and CANCELS `onCommit`. Error/Retry toasts simply omit `onCommit`.
  - `toastEl` is the rendered `<Toast>` (or null) — hosts drop `{toastEl}` into their JSX once; positioning fixed `bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50` (clears the mobile nav dock).
- Consumed by: F1 adoption sites now; any future error surface.

- [ ] **Step 1: Write the failing tests**

```js
// src/hooks/__tests__/useToast.test.js
import { renderHook, act } from '@testing-library/react';
import { useToast } from '../useToast';

jest.useFakeTimers();

describe('useToast', () => {
  it('shows and auto-expires, firing onCommit once', () => {
    const onCommit = jest.fn();
    const { result } = renderHook(() => useToast());
    act(() => result.current.showToast({ message: 'Deleted', onCommit }));
    expect(result.current.toast.message).toBe('Deleted');
    act(() => jest.advanceTimersByTime(5000));
    expect(result.current.toast).toBeNull();
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('action cancels onCommit and fires onAction', () => {
    const onCommit = jest.fn();
    const onAction = jest.fn();
    const { result } = renderHook(() => useToast());
    act(() => result.current.showToast({ message: 'Deleted', onCommit, action: { label: 'Undo', onAction } }));
    act(() => result.current.toast.action.onAction());
    // the hook wraps onAction so it also clears the toast + cancels commit
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(result.current.toast).toBeNull();
    act(() => jest.advanceTimersByTime(6000));
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('manual dismiss commits', () => {
    const onCommit = jest.fn();
    const { result } = renderHook(() => useToast());
    act(() => result.current.showToast({ message: 'Deleted', onCommit }));
    act(() => result.current.dismissToast());
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(result.current.toast).toBeNull();
  });

  it('superseding toast commits the previous one first', () => {
    const first = jest.fn();
    const second = jest.fn();
    const { result } = renderHook(() => useToast());
    act(() => result.current.showToast({ message: 'A', onCommit: first }));
    act(() => result.current.showToast({ message: 'B', onCommit: second }));
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
    expect(result.current.toast.message).toBe('B');
  });

  it('unmount flushes the pending commit', () => {
    const onCommit = jest.fn();
    const { result, unmount } = renderHook(() => useToast());
    act(() => result.current.showToast({ message: 'Deleted', onCommit }));
    unmount();
    expect(onCommit).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `npx jest src/hooks/__tests__/useToast.test.js --watchAll=false` → FAIL (module not found).

- [ ] **Step 3: Implement `src/hooks/useToast.js`**

```js
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Toast from '@/components/ui/Toast';
import React from 'react';

// One active toast per host. onCommit fires exactly once when the toast leaves
// WITHOUT its action being taken (expiry / dismiss / superseded / host unmount).
// The action (e.g. Undo) cancels onCommit. Error toasts omit onCommit.
export function useToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);
  const commitRef = useRef(null); // pending onCommit for the CURRENT toast

  const settle = useCallback((runCommit) => {
    clearTimeout(timerRef.current);
    const commit = commitRef.current;
    commitRef.current = null;
    if (runCommit && commit) commit();
  }, []);

  const dismissToast = useCallback(() => {
    settle(true);
    setToast(null);
  }, [settle]);

  const showToast = useCallback(({ message, variant = 'default', action, onCommit, duration = 5000 }) => {
    settle(true); // supersede: commit the previous toast first
    commitRef.current = onCommit || null;
    const wrappedAction = action
      ? {
          label: action.label,
          onAction: () => {
            settle(false); // action cancels commit
            setToast(null);
            action.onAction();
          },
        }
      : null;
    setToast({ message, variant, action: wrappedAction });
    timerRef.current = setTimeout(() => {
      settle(true);
      setToast(null);
    }, duration);
  }, [settle]);

  // Unmount flush: a pending delete must not be lost.
  useEffect(() => () => settle(true), [settle]);

  const toastEl = React.createElement(Toast, { toast, onDismiss: dismissToast });

  return { toast, toastEl, showToast, dismissToast };
}
```

- [ ] **Step 4: Implement `src/components/ui/Toast.jsx`** (markup lifted from QuickProtein's shipped toast, fixed-position variant)

```jsx
'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Toast({ toast, onDismiss }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          role="status" aria-live="polite"
          className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md border text-sm rounded-xl px-4 py-3 flex items-center justify-between z-50 ${
            toast.variant === 'error'
              ? 'bg-destructive/15 border-destructive/30 text-foreground'
              : 'bg-muted border-border text-foreground'
          }`}
        >
          <span>{toast.message}</span>
          {toast.action && (
            <button onClick={toast.action.onAction} className="font-bold text-protein-text ml-3 min-h-11 px-2">
              {toast.action.label}
            </button>
          )}
          <button onClick={onDismiss} aria-label="Dismiss" className="ml-3 text-muted-foreground min-h-11 min-w-11 flex items-center justify-center -mr-2">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 5: Run tests to verify pass** — hook suite green.

- [ ] **Step 6: Adopt across the sites** (read each site first; preserve all logic; each bullet is a contract):

1. **QuickProtein.jsx** — delete its local toast state/timer/markup; use the hook (`showToast({message: `Logged ${name}`, action: {label:'Undo', onAction: undo-logic}})`, error path `showToast({message, variant:'error'})`); render `{toastEl}`. NOTE the positioning moves from in-card to fixed bottom — intended unification.
2. **Dashboard.jsx `handleDeleteLog`** — optimistic: remove via a local `hiddenIds` state (filter todaysLogs passed to MealFeed), `showToast({message:'Meal deleted', action:{label:'Undo', onAction: () => unhide}, onCommit: () => deleteLog(logId, user.id).then(onLogDeleted).catch(showErrorToast)})`. On commit failure: unhide + error toast.
3. **Dashboard.jsx `handleUpdateWater`** — keep optimistic set; on catch: restore previous value + `showToast({message:"Couldn't save water", variant:'error'})` (capture prev before set).
4. **HistoryView.jsx meal deletes** (`handleDeleteLog` when NOT a workout, and any meal-row path) — same hidden+onCommit pattern; the ConfirmModal stays ONLY for workout-session paths (`:126` bulk delete + workout rows). Renders its own `{toastEl}`.
5. **WorkoutView.jsx `submitWorkout`** — wrap the finish fetch: on non-OK/throw, DO NOT clear session state; `showToast({message:"Couldn't save your workout", variant:'error', action:{label:'Retry', onAction: submitWorkout}})`. Replace `alert("Failed to delete workout")` (~:494) with an error toast. Render `{toastEl}`.
6. **page.jsx** — `alert("Failed to update log.")` (:252) → error toast (page hosts its own `useToast` + `{toastEl}`); `fetchData` catch → set a `staleData` flag rendering a slim dismissible banner under the header: `bg-destructive/15 border-b border-destructive/30 text-sm px-6 py-2` with "Showing cached data" + Retry button calling `fetchData` (banner, not toast — it persists until resolved; clears on successful fetch).
7. **InsightsView.jsx WeightEntry** — failure path gets `showToast({message:"Couldn't save weight", variant:'error'})`.

- [ ] **Step 7: Full suite + build + commit**

```bash
git add -A && git commit -m "feat(fixwave): shared toast infrastructure with undoable deletes and error surfacing"
```

---

### Task F3: Modal behavior unification (runs SECOND — infra before sweeps)

**Files:**
- Create: `src/hooks/useModalBehavior.js`
- Modify: `src/components/ui/Sheet.jsx` (refactor onto hook + swipe dismiss), `src/components/ConfirmModal.jsx`, `src/components/EditFoodModal.jsx`, `src/components/workout/PlateCalculator.jsx`, `src/components/dashboard/DailyProgress.jsx` (goal editor), `src/components/workout/WorkoutView.jsx` (summary, save-template, load-template modals)

**Interfaces:**
- Produces: `useModalBehavior(open, onClose) -> { closeRef }` — Escape→onClose (ref-stabilized, keyed [open]), body scroll lock, focus capture/move/restore with isConnected guard. EXACTLY Sheet's current two effects (`Sheet.jsx:23-48`), moved verbatim.

- [ ] **Step 1: Create the hook** — lift Sheet.jsx lines 13–48 wholesale:

```js
'use client';
import { useEffect, useRef } from 'react';

// Escape-to-close, body scroll lock, and focus capture/restore for any overlay.
// onClose is ref-stabilized so effects key on [open] only (consumers pass inline arrows).
export function useModalBehavior(open, onClose) {
  const closeRef = useRef(null);
  const prevFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onCloseRef.current();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    prevFocusRef.current = document.activeElement;
    closeRef.current?.focus();
    return () => {
      const prev = prevFocusRef.current;
      if (prev && prev.isConnected && typeof prev.focus === 'function') prev.focus();
    };
  }, [open]);

  return { closeRef };
}
```

- [ ] **Step 2: Sheet refactors onto it** — delete its inline copies, `const { closeRef } = useModalBehavior(open, onClose);` — zero behavior change (verify the X keeps `ref={closeRef}`).

- [ ] **Step 3: Sheet swipe-down dismiss** — on the panel `motion.div`: `drag={prefersReducedMotion ? false : 'y'} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }} onDragEnd={(e, info) => { if (info.offset.y > 80 || info.velocity.y > 500) onClose(); }}` — mobile-only affordance is fine to leave enabled at all widths (drag on desktop is inert-but-harmless); handle pill stays.

- [ ] **Step 4: Adopt in the six overlays.** Per overlay: call the hook with its open-state + close handler; give the primary close/cancel button `ref={closeRef}`; ensure backdrop `onClick` closes (add where missing — EditFoodModal notably); no visual changes. The six each render conditionally today — the hook's `open` param is their render condition hoisted (for always-mounted components pass the boolean; for conditionally-mounted ones the component IS the open state — call with `true` and rely on unmount cleanup; NOTE: focus-restore on unmount works via effect cleanup — verify per overlay which pattern applies and document in the report).

- [ ] **Step 5: Suite + build + manual pass** (Escape closes all 7; body scroll locked; focus returns) **+ commit**

```bash
git add -A && git commit -m "feat(fixwave): useModalBehavior across all overlays and Sheet swipe-dismiss"
```

---

### Task F2: Touch-target & label sweep

**Files:** `src/components/workout/WorkoutCard.jsx`, `src/components/dashboard/HydrationTracker.jsx`, `src/components/dashboard/MealFeed.jsx`, `src/app/page.jsx` (header buttons), `src/components/dashboard/DailyProgress.jsx` (goal editor input), `src/components/dashboard/WeeklyTrend.jsx`, `src/components/OnboardingForm.jsx`

- [ ] **Step 1: WorkoutCard** — set-complete button: `before:absolute before:-inset-2` hit expansion (row is `relative`) or `min-h-11 min-w-11`, `aria-label={`Mark set ${index + 1} ${set.completed ? 'not done' : 'done'}`}`, `aria-pressed={set.completed}`; when weight/reps empty → `disabled` + `opacity-40 cursor-not-allowed` (replaces silent no-op — the existing `toggleSetCompletion` guard stays as backstop). Remove-set X and header row buttons (calculator/quick-finish/delete): 44px + `aria-label`s ("Plate calculator", "Quick finish", "Delete exercise").
- [ ] **Step 2: HydrationTracker droplets** — `min-h-11 min-w-11` (or `before:` if layout fights), `aria-label={`Glass ${i + 1}`}`, `aria-pressed={i < waterIntake}`.
- [ ] **Step 3: MealFeed kebab + page.jsx gear/logout** — `aria-label` ("Meal options", "Settings", "Sign out") + 44px confirm.
- [ ] **Step 4: Goal editor** — `<label className="sr-only" htmlFor="goal-input">` + id; Save `disabled={Number.isNaN(parseInt(tempGoalValue))}` with disabled styling.
- [ ] **Step 5: WeeklyTrend** — after the aria-hidden marker row add `<span className="sr-only">{trainedSentence}</span>` built from `weeklyData` (e.g. "Trained Monday, Wednesday").
- [ ] **Step 6: Onboarding gender** — third option "Prefer not to say" (`value: 'unspecified'`); in `src/app/api/user/settings/route.js` BMR branch: `if (gender === 'male') bmr += 5; else if (gender === 'female') bmr -= 161; else bmr -= 78;` (midpoint).
- [ ] **Step 7: Suite + build + commit** — `git commit -m "feat(fixwave): 44px touch floor, control labels, inclusive onboarding"`

---

### Task F4: Token, color & copy sweep

**Files:** `src/components/dashboard/DailyProgress.jsx`, `MealFeed.jsx`, `HistoryView.jsx`, `EditFoodModal.jsx`, `AddFood.jsx`, `WorkoutCard.jsx`, `PickerView.jsx`, `WeeklyReviewCard.jsx`, `PlateCalculator.jsx`, `HydrationTracker.jsx`, `WorkoutView.jsx`, ~19 files for the indigo sweep, `eslint.config.mjs`, Create: `src/components/ui/Logo.jsx`

- [ ] **Step 1: Hero kcal** — `DailyProgress.jsx:42` → `<span className="text-sm text-muted-foreground tabular-nums mt-1">{calories} / {calorieGoal} kcal · {Math.max(0, calorieGoal - calories)} left</span>` (compute inside DualRing from existing props).
- [ ] **Step 2: Faint-content promotions** — WorkoutCard grid headers + category label, PickerView sublabels, WeeklyReviewCard subtitle: `text-faint` → `text-muted-foreground` (sizes unchanged). Decorative separators stay faint.
- [ ] **Step 3: Semantic colors** — `text-deficit` → `text-protein-text` (MealFeed P: chip, HistoryView:425, EditFoodModal protein focus `focus:border-deficit` → `focus:border-protein`, AddFood:535 same); MealFeed kcal `text-ai` → `text-foreground`.
- [ ] **Step 4: Indigo sweep** — `grep -rln "bg-indigo-600" src/` → replace `bg-indigo-600`→`bg-training`, `hover:bg-indigo-700`→`hover:bg-training/90` everywhere; delete PlateCalculator's two `blur-3xl` divs.
- [ ] **Step 5: `src/components/ui/Logo.jsx`**

```jsx
import React from 'react';

// Single source for the Liftly mark (was inlined in 6 files).
export default function Logo({ size = 36, className = '' }) {
  const icon = size >= 40 ? 24 : 20;
  return (
    <div className={`rounded-lg flex items-center justify-center bg-training ${className}`} style={{ width: size, height: size }}>
      <svg width={icon} height={icon} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M 75 18 H 35 C 22 18, 15 25, 15 38 V 62 C 15 75, 22 82, 35 82 H 65 C 78 82, 85 75, 85 62 V 38" stroke="#EBE9E4" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="56" cy="50" r="14" fill="#EBE9E4" style={{ opacity: 0.25 }} />
        <circle cx="50" cy="50" r="14" fill="#EBE9E4" />
      </svg>
    </div>
  );
}
```

Replace the six inline copies (grep `M 75 18 H 35`): page.jsx header, Sidebar, LandingPage nav, AuthView, AuthScreen, any remaining. (#EBE9E4 inside the mark is brand art, exempt from token law — note in the eslint rule comment.)
- [ ] **Step 6: Copy pass** — WeeklyReviewCard dates via `new Date(weekStart+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})` ("Week of Jul 6"); `cal`→`kcal` (HistoryView:268,435; anywhere `grep -rn "\bcal\b"` in JSX copy hits), "Calories" value labels normalized; quota format "N of M left" (DailyProgress AI buttons, AddFood scan counter); `WorkoutView.jsx:965` "Lifting Log"→"Train"; HydrationTracker "Bottles"→"Glasses" + delete the stale comment block; ConfirmModal: make `confirmLabel` a required prop (update its call sites with explicit labels).
- [ ] **Step 7: eslint guard** — in `eslint.config.mjs` add to the config array:

```js
{
  files: ['src/**/*.jsx', 'src/**/*.js'],
  rules: {
    'no-restricted-syntax': ['warn', {
      selector: "Literal[value=/(bg-indigo-6|bg-indigo-7|bg-white|text-slate-|bg-slate-)/]",
      message: 'Raw palette class — use semantic tokens (bg-training, bg-card, text-muted-foreground, ...).',
    }],
  },
},
```

Confirm `npm run build` still passes (warn severity) and note remaining warnings count in the report (should be ~0 after the sweep).
- [ ] **Step 8: Suite + build + commit** — `git commit -m "feat(fixwave): semantic color repair, indigo token sweep, Logo component, copy unification"`

---

### Task F5: Surgical bug batch

**Files:** `src/components/AddFood.jsx`, `src/app/globals.css`, `src/components/workout/PickerView.jsx`, `src/components/workout/WorkoutView.jsx`, Create: `src/components/workout/SessionTimer.jsx`, Delete: `src/components/Header.jsx`, `src/components/ui/hero-section-2.jsx`, Modify: `src/components/Sidebar.jsx`

- [ ] **Step 1: AddFood** — move/duplicate the `{error && ...}` block into the scan pane (render directly under the Use Camera / Upload buttons whenever `mode==='scan' && !preview && error`); `mealType` values lowercase (`'breakfast'...`), chips render capitalized labels from a `MEAL_TYPES = [{value:'breakfast', label:'Breakfast'}, ...]` array, highlight test `form.mealType?.toLowerCase() === value` (legacy tolerance).
- [ ] **Step 2: globals.css** — next to `.pb-safe`:

```css
.pt-safe { padding-top: env(safe-area-inset-top); }
.no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }
```

- [ ] **Step 3: PickerView** — signature gains `loading, error, onRetry`; WorkoutView passes real states from `fetchExercises` (add `exercisesError` state, set in catch, retry re-calls). Render: loading → existing spinner; error → message + Retry button (`bg-training`); loaded-but-filtered-empty → "No exercises match ‘{query}’" row. The row `+`: replace `opacity-0 group-hover:opacity-100` with `md:opacity-0 md:group-hover:opacity-100` (visible at rest below md, hover-reveal on desktop).
- [ ] **Step 4: SessionTimer** —

```jsx
'use client';
import React, { useEffect, useState } from 'react';

// Owns the 1s tick so the parent (and every WorkoutCard) doesn't re-render per second.
export default function SessionTimer({ startedAt, className = '' }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return <span className={`tabular-nums ${className}`}>{m}:{String(s).padStart(2, '0')}</span>;
}
```

WorkoutView: replace the ticking `elapsedTime` state with a `sessionStartRef` (ms timestamp captured where the timer currently starts); sticky header renders `<SessionTimer startedAt={...} className="font-display text-2xl font-bold text-training-text leading-none" />`; at finish, `duration = Math.floor((Date.now() - startRef.current)/1000)`. Preserve pause/resume semantics IF the current code has them (read first — if elapsed is accumulated across pauses, keep an accumulated-offset ref; document what you found). The summary display formatting reuses the existing `formatTime`.
- [ ] **Step 5: Deletions** — `git rm src/components/Header.jsx src/components/ui/hero-section-2.jsx`; remove Sidebar's unused `useState`; `grep -rn "components/Header\|hero-section-2" src/` → empty.
- [ ] **Step 6: Suite + build + commit** — `git commit -m "fix(fixwave): camera error visibility, safe-area/scrollbar utilities, picker states, timer isolation, dead code"`

---

### Task F6: Auth & landing hardening

**Files:** `src/app/auth/page.jsx` (redirect), `src/components/landing-page/LandingPage.jsx` (param + logo/back swap), `src/components/landing-page/AuthView.jsx`, `src/components/AuthScreen.jsx`, `src/components/landing-page/sections.jsx` (footer), Create: `src/app/privacy/page.jsx`, `src/app/terms/page.jsx`

- [ ] **Step 1: `/auth` redirect** — `src/app/auth/page.jsx` becomes:

```jsx
import { redirect } from 'next/navigation';

export default function AuthRedirect() {
  redirect('/?auth=1');
}
```

- [ ] **Step 2: LandingPage reads the param** — wrap the param consumer per Next 15 rules: `const searchParams = useSearchParams()` must live under Suspense. Pattern: extract a tiny `<AuthParamListener onOpen />` child (uses useSearchParams, calls onOpen once when `auth==='1'`, then `router.replace('/', {scroll:false})` to clean the URL) rendered inside `<Suspense fallback={null}>`. showAuth state logic otherwise unchanged.
- [ ] **Step 3: AuthView continuity** — top row becomes: `<Logo>` + wordmark LEFT (button, onClick=onBack, aria-label "Liftly — back to landing"), Back/X affordance RIGHT (`<X>` icon button, aria-label "Close sign in", min-h-11). Matches the landing nav's logo position; kills the jump.
- [ ] **Step 4: AuthScreen additions** (logic-preserving):
  - State: `mode` gains `'reset'` + `resetSent` flag. "Forgot password?" link (sign-in mode only, under the password field, `text-protein-text text-sm`) → reset view: email field + "Send reset link" → `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })` → confirmation copy "Check your email — we sent a reset link." + back-to-sign-in.
  - Inputs: `autoComplete="email"`, password `autoComplete={isRegistering ? 'new-password' : 'current-password'}`, name `autoComplete="name"`.
  - Password visibility: eye toggle button inside the field (right), `aria-label={show ? 'Hide password' : 'Show password'}`, `min-h-11 min-w-11`, toggles input type.
  - Register hint under password: `<p className="text-xs text-muted-foreground -mt-2 mb-4">At least 6 characters</p>` (render only when registering).
  - Toggle link: `text-training-text` → `text-protein-text` (owner-ratified).
- [ ] **Step 5: Footer + legal pages** — in sections.jsx after the CTA band:

```jsx
<footer className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground border-t border-border">
  <div className="flex items-center gap-2"><Logo size={28} /><span>© 2026 Liftly</span></div>
  <div className="flex items-center gap-6">
    <a href="/privacy" className="hover:text-foreground">Privacy</a>
    <a href="/terms" className="hover:text-foreground">Terms</a>
    <span className="text-faint">Photo: Sven Mieke / Unsplash</span>
  </div>
</footer>
```

`/privacy` + `/terms`: static pages, `bg-background text-foreground` shell, h1 + honest placeholder ("This policy is being drafted. Liftly stores your workout and nutrition logs solely to provide the service. Contact: yessirskiwspg@gmail.com."), back link to `/`.
- [ ] **Step 6: Suite + build + manual (redirect works incl. cleaned URL; reset email flow against dev Supabase; eye toggle; footer renders) + commit** — `git commit -m "feat(fixwave): auth recovery and hardening, /auth redirect, landing footer and legal stubs"`

---

## Verification (end-to-end)

1. `npx jest --watchAll=false` (25 + ~5 new) green; `npm run build` clean; eslint palette warnings ≈ 0.
2. Toast paths: offline finish → Retry keeps session; water fail rolls back; meal delete → Undo restores (and unmount mid-toast still deletes — verify via nav-away test); QuickProtein still works on the shared hook.
3. All 7 overlays: Escape, scroll-lock, focus restore, backdrop dismiss; Sheet swipe-down dismisses (and doesn't under reduced motion).
4. 44px audit on every swept control; screen-reader labels present.
5. `/auth` → lands on photo AuthView with clean URL; reset-password email arrives (dev Supabase); autofill hints work.
6. Lighthouse a11y on `/` stays 100.
7. Closing gate: critique-agent re-score of Today / Train / Add Food / History / Landing-Auth — no fixed screen below B.
