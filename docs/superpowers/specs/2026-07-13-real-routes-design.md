# Liftly: Real Routes — Design Spec

**Date:** 2026-07-13
**Status:** Approved
**Branch:** `dark-athletic-redesign`
**Source:** UX critique finding 10 + the ledger's LCP deferral ([`../reviews/2026-07-12-app-ux-critique.md`](../reviews/2026-07-12-app-ux-critique.md), Bigger bet #1). Closes three problems in one migration: back-button exits the app, `/`-route ships the entire app bundle (356kB vs 199kB), and AddFood drafts die on a mis-tap.

## Context

Five "screens" are one route with `activeTab` state in `src/app/page.jsx`: nothing is linkable, refresh lands on Today, browser back exits, and the landing page pays for recharts. This spec moves tabs to App Router segments with a shared client layout, making the landing bundle landing-only and every screen addressable.

**Owner decisions (2026-07-13):** `/` = landing for logged-out, authed users redirect to `/today`; unauthed deep links bounce to `/?auth=1&next=<path>` and return to target after sign-in.

## 1. Route structure

```
src/app/
  page.jsx                 → landing-only (no app-component imports) + authed→/today redirect
  (app)/
    layout.jsx             → client layout: auth gate + AppProvider + shell chrome
    today/page.jsx         → <Dashboard {...fromContext} />
    train/page.jsx         → <WorkoutView .../>
    insights/page.jsx      → <InsightsView .../>
    history/page.jsx       → <HistoryView .../>
    add/page.jsx           → <AddFood .../>
    settings/page.jsx      → <SettingsView .../> (+ retake-assessment state)
```

Thin pages only — screen components' internals unchanged. Shell chrome (Sidebar, mobile header, nav dock, action sheet, page-level toast host, stale-data banner, edit-food modal, onboarding modal) lives in `(app)/layout.jsx`.

## 2. State & context

`src/components/app/AppProvider.jsx` lifts `page.jsx`'s state wholesale — user/session, logs, workoutLogs, activeWorkoutLogs, settings-derived goals/offsets, dailyStats, streak/status, weeklyData, trainedToday/bumpSkipped, `fetchData`, `handleUpdateGoal`, `handleUpdateLog`, onboarding flow — exposed through one `useApp()` hook. Same variable names, same localStorage cache behavior, same timezone sync. Thin pages map context → the existing prop lists; zero screen-component prop changes.

## 3. Navigation & auth gating

- Nav dock + Sidebar: `setActiveTab` → `<Link href>` with `usePathname()` active state; add real `aria-current="page"` (closes the old ledger minor). Action-sheet buttons navigate via `router.push`.
- Auth gate in `(app)/layout.jsx`: session resolved → no user → `router.replace('/?auth=1&next=' + pathname)`. LandingPage's existing AuthParamListener gains `next` handling: after successful sign-in, `router.replace(next || '/today')` (validate: `next` must start with `/` and match a known app route — no open redirects).
- Root `page.jsx`: authed users are redirected to `/today` (client-side after session check; brief flash acceptable — landing has no auth-gated data).
- `/auth/page.jsx` redirect preserves `next` (`/auth?next=X` → `/?auth=1&next=X`).
- Logout (header/sidebar): signOut then `router.replace('/')`.

## 4. AddFood draft persistence

New `useSessionDraft(key, initialState)` hook: state backed by `sessionStorage` (write-through on change, restore on mount, `clear()` on successful save or explicit cancel). AddFood's form state adopts it (`key: 'snapcal_addfood_draft'`) — drafts survive tab navigation AND refresh; scan preview images are NOT persisted (too large — text fields only, documented). Jest tests for the hook.

## 5. Explicitly unchanged / out of scope

Screen component internals; visual shell appearance; Supabase middleware; workout session model; unmount semantics for non-AddFood tabs (scroll restoration comes from the router). Out of scope: units, Settings content, focus traps, route prefetch tuning, service worker/PWA offline.

## 6. Verification

- Jest green (current 39 + useSessionDraft tests); `npm run build` clean with **per-route first-load sizes recorded in the report**: `/` target ≤ ~120kB (landing-only), recharts confined to `/insights` (+`/today` if WeeklyTrend keeps it — record actuals).
- Manual: back walks tab history and exits only from entry; refresh preserves tab; unauthed `/train` deep link → auth → lands on `/train`; authed `/` → `/today`; AddFood draft survives nav + refresh and clears on save; all nav paths (dock, sidebar, action sheet, CTA band, `next` returns) work.
- Lighthouse on `/`: performance re-measured (the ledger's LCP item — record before/after), a11y stays 100.
