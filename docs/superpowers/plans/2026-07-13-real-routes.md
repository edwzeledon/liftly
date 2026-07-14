# Real Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the five-tab SPA to App Router segments (`/today /train /insights /history /add /settings`), landing-only `/`, auth-gated app layout with shared context, and sessionStorage AddFood drafts.

**Architecture:** Strangler migration in two green steps: R2 builds the `(app)` route group ALONGSIDE the working tab SPA (both routable, app untouched); R3 flips `/` to landing-only and nav to Links, deleting the tab machinery. State lifts wholesale into `AppProvider` — same names, same behavior, zero screen-component internal changes.

**Tech Stack:** Next.js 15 App Router (route groups, useRouter/usePathname/Link), React context, sessionStorage, Jest 30.

**Spec:** `docs/superpowers/specs/2026-07-13-real-routes-design.md`

## Global Constraints

- Branch `dark-athletic-redesign`; JS only; every task: `npx jest --watchAll=false` green (39+) + `npm run build` clean + one commit. THE APP MUST WORK AT EVERY COMMIT (strangler order matters).
- Screen components (Dashboard, WorkoutView, InsightsView, HistoryView, AddFood, SettingsView) keep their internals and prop contracts — thin pages adapt context to the EXISTING prop lists.
- State lift is verbatim: same variable names, same effects, same localStorage keys, same handler bodies. Moving code, not rewriting it.
- `next` param validation: must start with `/`, must be one of the six app paths (whitelist) — no open redirects.
- Repo lint: `react-hooks/set-state-in-effect` build error; palette-class warn rule active.
- Out of scope: units, Settings content, focus traps, prefetch tuning, PWA/offline, changing unmount semantics for non-AddFood tabs.

---

### Task R1: useSessionDraft hook

**Files:**
- Create: `src/hooks/useSessionDraft.js`
- Test: `src/hooks/__tests__/useSessionDraft.test.js`

**Interfaces:**
- Produces: `useSessionDraft(key, initialState) -> [state, setState, clearDraft]` — state initialized from `sessionStorage[key]` (JSON) when present else `initialState`; every `setState` write-through persists (functional updates supported); `clearDraft()` removes the key AND resets state to `initialState`. SSR-safe (guard `typeof window`), storage errors swallowed. Consumed by R4 (AddFood).

- [ ] **Step 1: Failing tests**

```js
// src/hooks/__tests__/useSessionDraft.test.js
import { renderHook, act } from '@testing-library/react';
import { useSessionDraft } from '../useSessionDraft';

describe('useSessionDraft', () => {
  beforeEach(() => sessionStorage.clear());

  it('initializes from initialState when storage is empty', () => {
    const { result } = renderHook(() => useSessionDraft('k', { a: 1 }));
    expect(result.current[0]).toEqual({ a: 1 });
  });

  it('restores a persisted draft', () => {
    sessionStorage.setItem('k', JSON.stringify({ a: 2 }));
    const { result } = renderHook(() => useSessionDraft('k', { a: 1 }));
    expect(result.current[0]).toEqual({ a: 2 });
  });

  it('write-through persists on set (object and functional)', () => {
    const { result } = renderHook(() => useSessionDraft('k', { a: 1 }));
    act(() => result.current[1]({ a: 3 }));
    expect(JSON.parse(sessionStorage.getItem('k'))).toEqual({ a: 3 });
    act(() => result.current[1]((prev) => ({ a: prev.a + 1 })));
    expect(JSON.parse(sessionStorage.getItem('k'))).toEqual({ a: 4 });
  });

  it('clearDraft removes the key and resets state', () => {
    const { result } = renderHook(() => useSessionDraft('k', { a: 1 }));
    act(() => result.current[1]({ a: 9 }));
    act(() => result.current[2]());
    expect(sessionStorage.getItem('k')).toBeNull();
    expect(result.current[0]).toEqual({ a: 1 });
  });

  it('survives corrupted storage', () => {
    sessionStorage.setItem('k', '{not json');
    const { result } = renderHook(() => useSessionDraft('k', { a: 1 }));
    expect(result.current[0]).toEqual({ a: 1 });
  });
});
```

- [ ] **Step 2: RED** — `npx jest src/hooks/__tests__/useSessionDraft.test.js --watchAll=false` → module not found.

- [ ] **Step 3: Implement**

```js
'use client';
import { useCallback, useState } from 'react';

// Session-scoped draft persistence: survives tab navigation and refresh,
// dies with the browser tab. Write-through on every set; storage failures
// (quota, disabled) degrade to in-memory state silently.
export function useSessionDraft(key, initialState) {
  const [state, setState] = useState(() => {
    if (typeof window === 'undefined') return initialState;
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialState;
    } catch {
      return initialState;
    }
  });

  const set = useCallback((next) => {
    setState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      try {
        sessionStorage.setItem(key, JSON.stringify(value));
      } catch { /* quota/disabled: keep in-memory */ }
      return value;
    });
  }, [key]);

  const clearDraft = useCallback(() => {
    try { sessionStorage.removeItem(key); } catch { /* ignore */ }
    setState(initialState);
    // initialState is intentionally captured from first render (draft semantics)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [state, set, clearDraft];
}
```

- [ ] **Step 4: GREEN** — hook suite passes. Full suite + build.
- [ ] **Step 5: Commit** — `git commit -m "feat(routes): sessionStorage-backed draft hook"`

---

### Task R2: AppProvider + (app) route group (parallel structure — old SPA untouched)

**Files:**
- Create: `src/components/app/AppProvider.jsx`, `src/app/(app)/layout.jsx`, `src/app/(app)/{today,train,insights,history,add,settings}/page.jsx`
- Modify: NONE of the existing app (page.jsx stays fully functional this task)

**Interfaces:**
- Produces: `AppProvider` + `useApp()` exposing EXACTLY the state/handlers page.jsx holds today (enumerate from the source: user, loading, logs, workoutLogs, activeWorkoutLogs, dailyGoal, macroGoals, editingLog/setEditingLog, scanCount, streak, streakStatus, showOnboarding, isRetakingAssessment/setIsRetakingAssessment, showActionSheet/setShowActionSheet, bumpSkipped, staleData, showToast/toastEl, fetchData, handleToggleBumpSkip, handleUpdateGoal, handleUpdateLog, handleOnboardingComplete, handleLogout, plus derived: todaysLogs, caloriesToday, percentComplete, remaining/effective goal pieces, weeklyData, trainedToday, isTrainingDay, calorieOffset, trainingOffset, offsetSkipped). Layout renders chrome + gate; thin pages consume.

- [ ] **Step 1: AppProvider — move, don't rewrite**

Create `src/components/app/AppProvider.jsx`: `'use client'`, a context + `export function useApp()` + `export default function AppProvider({ children })`. Body = page.jsx's state/effects/handlers/derived sections MOVED VERBATIM (everything between the state declarations and the `// --- Render ---` comment, minus `activeTab`). The `value` object exposes the enumerated interface. `handleLogout` gains `router.replace('/')` after signOut (import useRouter — the ONLY behavioral addition, per spec §3).

- [ ] **Step 2: (app)/layout.jsx**

```jsx
'use client';
// App shell: auth gate + provider + chrome. Screen content renders via {children}.
import React, { Suspense, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AppProvider, { useApp } from '@/components/app/AppProvider';
// + the chrome imports page.jsx uses today: Sidebar, Logo, EditFoodModal, OnboardingForm, Sheet, NavButton pieces, icons

function AppShell({ children }) {
  const app = useApp();
  const pathname = usePathname();
  const router = useRouter();

  // Auth gate: once the session resolves, bounce unauthed users to the landing
  // auth view, preserving the intended destination.
  useEffect(() => {
    if (!app.loading && !app.user) {
      router.replace(`/?auth=1&next=${encodeURIComponent(pathname)}`);
    }
  }, [app.loading, app.user, pathname, router]);

  if (app.loading) return /* the existing full-screen Loader2 spinner block from page.jsx */;
  if (!app.user) return null; // redirect in flight

  return (
    /* page.jsx's authed shell JSX, MOVED: outer flex, <Sidebar/>, mobile header,
       <main>{children}</main> replacing the activeTab conditionals, nav dock,
       stale-data banner, editingLog modal, onboarding modal, action sheet, {toastEl}.
       Nav wiring changes to Links happen in R3 — for THIS task keep the dock/sidebar
       calling router.push(path) via a small adapter so the new routes are usable:
       activeTab equivalence = pathname ('/today'→home etc.) for active styling. */
  );
}

export default function AppLayout({ children }) {
  return (
    <AppProvider>
      <Suspense fallback={null}>
        <AppShell>{children}</AppShell>
      </Suspense>
    </AppProvider>
  );
}
```

(The commented blocks are MOVES from page.jsx — the implementer lifts the real JSX; page.jsx itself is not edited in R2, so copy now, delete in R3.)

- [ ] **Step 3: Six thin pages** — template (adjust props per screen from page.jsx's current tab blocks):

```jsx
'use client';
import Dashboard from '@/components/Dashboard';
import { useApp } from '@/components/app/AppProvider';

export default function TodayPage() {
  const app = useApp();
  return (
    <Dashboard
      caloriesToday={app.caloriesToday}
      dailyGoal={app.dailyGoal}
      /* ...exactly the prop list page.jsx passes today, from app.* ... */
    />
  );
}
```

`settings/page.jsx` carries the `isRetakingAssessment` conditional (OnboardingForm-in-place) exactly as page.jsx's settings block does. `add/page.jsx` maps AddFood's onSuccess to `fetchData()` + `router.push('/today')`.

- [ ] **Step 4: Verify BOTH worlds** — `npm run dev`: old `/` SPA fully functional AND `/today` etc. render the same screens behind the new gate; unauthed `/train` bounces to `/?auth=1&next=%2Ftrain`. Jest + build green.
- [ ] **Step 5: Commit** — `git commit -m "feat(routes): app route group with AppProvider and thin pages (parallel to SPA)"`

---

### Task R3: The flip — landing-only root, Link nav, delete tab machinery

**Files:**
- Rewrite: `src/app/page.jsx` (→ landing-only + authed redirect, ~40 lines)
- Modify: `src/app/(app)/layout.jsx` (nav → real Links), `src/components/Sidebar.jsx` (Links + usePathname + aria-current), `src/components/landing-page/LandingPage.jsx` (next-param honor + post-auth redirect), `src/app/auth/page.jsx` (preserve next)

**Interfaces:**
- Consumes: R2's routes (now the only app entry). Root page: session check → authed `router.replace('/today')`, else `<LandingPage/>`.

- [ ] **Step 1: Root page.jsx rewrite**

```jsx
'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import LandingPage from '@/components/landing-page/LandingPage';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session?.user) {
        router.replace('/today');
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- async session resolution, not synchronous render state
        setChecking(false);
      }
    });
    return () => { cancelled = true; };
  }, [router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 text-training-text animate-spin" />
      </div>
    );
  }
  return <LandingPage />;
}
```

CRITICAL: no app-component imports remain in this file or its import graph (Dashboard/WorkoutView/etc. now reachable only via `(app)/`) — this is the LCP payoff. Verify with `grep -n "import" src/app/page.jsx`.

- [ ] **Step 2: Nav → Links.** In the app layout: NavButton becomes a `<Link href>` wrapper (same classes; active = `pathname === href`; add `aria-current={active ? 'page' : undefined}`); dock's `[+]` opens the action sheet (unchanged); action-sheet tiles → `router.push('/train' | '/add')`; header gear → `<Link href="/settings">`; Sidebar buttons → Links with `usePathname` + aria-current; sidebar Log CTA keeps opening the action sheet.
- [ ] **Step 3: next-param plumbing.** LandingPage: `AuthParamListener` also captures `next`; store in a ref/state; when auth succeeds (the existing session-established path — find where the app currently transitions after sign-in: supabase `onAuthStateChange` in... the OLD page.jsx handled it; now LandingPage must listen: add an `onAuthStateChange` effect in LandingPage (or root page) that on SIGNED_IN does `router.replace(validateNext(next) || '/today')`). Whitelist validator:

```js
const APP_PATHS = ['/today', '/train', '/insights', '/history', '/add', '/settings'];
const validateNext = (n) => (APP_PATHS.includes(n) ? n : null);
```

`/auth/page.jsx`: `redirect('/?auth=1' + (next ? `&next=${encodeURIComponent(next)}` : ''))` — it's a server component; read `searchParams` prop.
- [ ] **Step 4: Full manual pass** — logged-out: `/` landing; sign-in → `/today`; deep-link round-trip with next; authed `/` → `/today`; back button walks history; refresh preserves route; logout → `/`; every nav path works; onboarding modal still fires for new users on any app route.
- [ ] **Step 5: Jest + build (record per-route First Load JS table in the report). Commit** — `git commit -m "feat(routes): landing-only root, Link navigation, tab machinery removed"`

---

### Task R4: AddFood draft adoption

**Files:**
- Modify: `src/components/AddFood.jsx`

- [ ] **Step 1:** Identify AddFood's text-form state (foodItem/calories/macros/mealType — the `form` object; NOT preview/image/camera state). Replace its useState with `useSessionDraft('snapcal_addfood_draft', INITIAL_FORM)`; call `clearDraft()` on successful save AND on explicit cancel (the onCancel path); scan-result population writes through the draft setter (an analyzed-then-abandoned form also survives — intended). Image/preview state stays ephemeral (document).
- [ ] **Step 2:** Manual: type → switch tab → return: draft intact; refresh: intact; save: cleared; cancel: cleared. Jest + build. Commit — `git commit -m "feat(routes): AddFood drafts survive navigation and refresh"`

---

### Task R5: Verification pass

- [ ] **Step 1:** Bundle table: `npm run build` output per route — `/` ≤ ~120kB first-load target; recharts absent from `/` chunkgraph (verify via build output or `next build --debug` sizes; record actuals for `/today` and `/insights`).
- [ ] **Step 2:** Lighthouse on `/`: performance (record LCP before/after vs the ledger's 356kB-era baseline) + a11y 100 held. Auth view + one app screen keyboard pass (nav Links focusable, aria-current announced).
- [ ] **Step 3:** Back/refresh/deep-link matrix re-run; AddFood draft matrix; `git grep -n "setActiveTab\|activeTab"` → 0 hits in src/.
- [ ] **Step 4:** Small fixes inline; structural findings reported. Commit — `git commit -m "chore(routes): verification pass"`

---

## Verification (end-to-end)
Jest (44+) green; build clean; bundle table recorded; LCP re-measured; nav/back/refresh/deep-link/draft matrices pass; zero activeTab remnants; Lighthouse a11y 100.
