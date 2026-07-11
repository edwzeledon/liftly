# Liftly Codebase Reference

> Generated 2026-07-11 by a codebase exploration pass. Snapshot of the app as of commit `b9a3912`.
> Companion doc: [`superpowers/specs/2026-07-11-lifter-first-repositioning-design.md`](superpowers/specs/2026-07-11-lifter-first-repositioning-design.md)

## 1. Tech Stack & Dependencies

**Framework & Runtime:**
- Next.js 15.0.0 (App Router)
- React 19.2.0

**Database & Auth:**
- Supabase (PostgreSQL) — @supabase/ssr 0.8.0, @supabase/supabase-js 2.86.0
- Row Level Security (RLS) enforced at DB level

**AI Integration:**
- Google Gemini Vision API (primary: `gemini-3.5-flash`, fallback: `gemini-2.5-flash`)

**UI & Animation:**
- Tailwind CSS 4 (@tailwindcss/postcss)
- Framer Motion 12.23.24
- Lucide React 0.555.0 (icons)
- canvas-confetti 1.9.4
- Recharts 3.5.1

**Dev & Testing:**
- Jest 30.4.2 (@testing-library/react, @testing-library/jest-dom)
- ESLint 9, Babel 7

**Utilities:** clsx 2.1.1, tailwind-merge 3.4.0

## 2. Directory Map

```
src/
├── app/
│   ├── layout.jsx                      # Root layout wrapper, PWA metadata
│   ├── page.jsx                        # Main app shell (auth guard, routing, state mgmt)
│   ├── auth/page.jsx                   # Auth page with AuthScreen component
│   ├── globals.css                     # Global styles (Tailwind directives, shadcn tokens)
│   ├── api/
│   │   ├── logs/route.js               # GET/POST logs (fetch/create food entries)
│   │   ├── logs/[id]/route.js          # PUT/DELETE single log (edit/delete meal)
│   │   ├── user/settings/route.js      # GET/POST user settings (goals, profile, macro calc)
│   │   ├── daily-stats/route.js        # GET/POST daily stats (water, weight, AI usage)
│   │   ├── daily-stats/__tests__/      # Example jest test (auth, errors, success)
│   │   ├── gemini/analyze/route.js     # POST image analysis (AI food scan + rate limit)
│   │   ├── gemini/text/route.js        # POST meal suggestion/daily overview (AI text)
│   │   ├── exercises/route.js          # GET public exercises list (no auth)
│   │   ├── workouts/logs/route.js      # GET/POST workout logs (fetch/create exercises)
│   │   ├── workouts/logs/[id]/route.js # PUT/DELETE workout log (edit/delete, session cleanup)
│   │   ├── workouts/finish/route.js    # POST finish workout (close session, record duration)
│   │   ├── workouts/templates/route.js # GET/POST workout templates
│   │   ├── workouts/history/route.js   # GET workout logs for date
│   │   ├── workouts/history/best/route.js # GET best set + last workout (PR tracking)
│   │   └── workouts/history/last/route.js # GET last workout (pre-fill form)
│   ├── icon.js & apple-icon.js         # Favicon assets
│   └── manifest.js                     # PWA manifest
│
├── components/
│   ├── Dashboard.jsx                   # Main home tab orchestration (289 lines)
│   ├── AddFood.jsx                     # Food scan/manual log UI (576 lines, camera + AI)
│   ├── HistoryView.jsx                 # History tabs (meals/workouts) with delete (475 lines)
│   ├── EditFoodModal.jsx               # Modal to edit food entry macros/calories
│   ├── OnboardingForm.jsx              # Multi-step assessment (438 lines)
│   ├── SettingsView.jsx                # Settings panel (retake assessment button)
│   ├── AuthScreen.jsx                  # Email/password/OAuth login/signup (204 lines)
│   ├── Sidebar.jsx                     # Desktop navigation
│   ├── BottomNav.jsx                   # DEAD CODE: duplicate nav that omits Workouts
│   ├── Header.jsx                      # Simple branding header
│   ├── ConfirmModal.jsx                # Reusable delete confirmation dialog
│   ├── dashboard/
│   │   ├── DailyProgress.jsx           # Circular charts, calories + 3 macros (233 lines)
│   │   ├── WeeklyTrend.jsx             # Bar chart, 7-day calorie trend (266 lines, hand-rolled)
│   │   ├── WeightTrend.jsx             # Line chart, weight over 7/30/90 days (Recharts)
│   │   ├── MacroDistribution.jsx       # Pie chart (hand-rolled SVG)
│   │   ├── MealFeed.jsx                # List of today's meals with delete
│   │   ├── QuickAdd.jsx                # Quick-log buttons (calorie-only, protein: 0)
│   │   └── HydrationTracker.jsx        # Water intake counter
│   ├── workout/
│   │   ├── WorkoutView.jsx             # Main workout tab (1,023 lines, session mgmt)
│   │   ├── WorkoutCard.jsx             # Exercise card, sets tracker + PR logic (478 lines)
│   │   ├── PickerView.jsx              # Exercise picker modal
│   │   └── PlateCalculator.jsx         # Barbell plate calculator
│   ├── landing-page/                   # LandingPage, Hero, Pricing (pricing has no payment flow)
│   ├── ui/hero-section-2.jsx           # DEAD CODE: unreferenced
│   └── __tests__/Header.test.jsx       # Template test (won't pass as-is)
│
├── lib/
│   ├── api.js                          # Fetch wrapper functions (logs, workouts, settings, Gemini)
│   ├── gemini.js                       # Gemini client (retry w/ backoff, model fallback)
│   ├── prompts.js                      # Prompt templates (imageAnalysis, mealSuggestion, dailyOverview)
│   ├── supabaseClient.js               # Browser Supabase client singleton
│   ├── supabase/server.js              # Server-side Supabase client factory
│   └── utils.js                        # cn() classname utility
│
└── middleware.js                       # Auth middleware (getUser every request, cache headers)
```

## 3. Data Model

**Note:** `supabase/migrations/` is empty — schema below is inferred from API routes and frontend code. RLS policies are assumed, not verified from source control.

### logs (food/meal entries)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → auth.users | indexed |
| food_item | text | |
| calories / protein / carbs / fats | integer | macros default 0 |
| meal_type | text | breakfast/lunch/dinner/snack |
| method | text | 'ai-scan' or 'manual' |
| image_url | text nullable | |
| date | timestamp | |

### user_settings (profile + goals)
| Column | Type | Notes |
|---|---|---|
| id, user_id | uuid | user_id unique |
| is_new_user | boolean | triggers onboarding |
| daily_goal / protein_goal / carbs_goal / fats_goal | integer | |
| timezone | text | server uses for date boundaries |
| current_streak | integer | |
| last_log_date | text YYYY-MM-DD | food-only today |

### daily_stats (per-day aggregates; composite key user_id+date)
water_intake (int), weight (numeric nullable), scan_count (AI scan limit 5/day), overview_count (1/day), suggestion_count (1/day).

### workout_sessions
id, user_id, status ('active'|'completed'), created_at, ended_at, duration_seconds.

### workout_logs (exercises within a session)
id, user_id, session_id FK, exercise_name, category, sets (jsonb array of `{weight, reps, completed}`), date.

### exercises (public read reference)
id, name, category, description.

### workout_templates
id, user_id, name, exercises (jsonb).

All user tables: RLS restricting CRUD to own rows.

## 4. Feature Inventory (all fully implemented)

1. **AI Food Scanning** — `AddFood.jsx` → `POST /api/gemini/analyze` (base64 image) → structured JSON `{foodItem, calories, protein, carbs, fats}` → user adjusts → `POST /api/logs`. Camera/drag-drop/paste inputs; 5 scans/day server-enforced (429 on limit).
2. **Manual Food Logging** — AddFood manual tab + `EditFoodModal.jsx`; `QuickAdd.jsx` fast path (calorie-only, submits protein: 0).
3. **Workout Tracking** — `WorkoutView.jsx` session management; PickerView exercise selection; WorkoutCard set tracking with 1s-debounced autosave; PR detection vs `/api/workouts/history/best` with confetti; templates save/load; plate calculator. localStorage caches per exercise (`snapcal_history_*`, `snapcal_pr_*`).
4. **Streaks** — computed from `user_settings.last_log_date` (FOOD ONLY) in `/api/logs` POST (increment/reset) and `page.jsx` ~104–130 (safe/at_risk/broken status).
5. **Dashboard** — DailyProgress rings (calories hero + 3 equal macro rings), WeeklyTrend bars, WeightTrend line (Recharts, the house chart style), MacroDistribution pie, MealFeed, HydrationTracker. localStorage-first, refetch-for-truth.
6. **Chef's Suggestion & Daily Overview** — `POST /api/gemini/text` (type suggestion|overview), 1/day each, plain-text responses in a modal.
7. **Onboarding & Settings** — 4-step OnboardingForm; server computes goals via Mifflin-St Jeor BMR × activity factor ± goal adjustment; macro splits by goal (lose 40/30/30 P/C/F, maintain 30/40/30, gain 30/45/25); safety caps (1200F/1500M); timezone sync on load.
8. **Auth** — Supabase email/password + Google OAuth; middleware refreshes session every request; component-level guards (no route-level protection).
9. **History** — meals/workouts toggle, date-grouped, edit/delete with PR cache invalidation.
10. **Hydration** — counter in daily_stats.

## 5. AI Integration

- **Models:** `gemini-3.5-flash` primary → `gemini-2.5-flash` fallback (env `GEMINI_MODEL`); key in `GEMINI_API_KEY` (server-only).
- **Retry:** `lib/gemini.js` — 3 retries, exponential backoff (1s/2s/4s), retries 429/5xx, fails fast on 4xx, model fallback after exhaustion.
- **Prompts** (`lib/prompts.js`):
  - `imageAnalysis` — returns raw JSON `{foodItem, calories, protein, carbs, fats}`; "Unknown"/zeros if not food.
  - `mealSuggestion(dailyGoal, history, remaining)` — one meal fitting remaining budget, plain text.
  - `dailyOverview(history, dailyGoal, caloriesToday)` — encouraging 2–3 sentence summary + one tip, plain text.
- **Rate limits:** enforced server-side against `daily_stats` counters (scan 5/day, suggestion 1/day, overview 1/day), timezone-aware day boundaries.

## 6. Architecture Notes

- **All data access via `/api/*` routes** (no Server Actions). Auth per-route via `supabase.auth.getUser()`.
- **State:** React hooks lifted into `page.jsx`; no state library. `activeWorkoutLogs` lives in `page.jsx`.
- **Caching:** localStorage-first render, background refetch (`snapcal_logs`, `snapcal_settings`, `snapcal_activeWorkoutLogs`, `snapcal_workout_templates`, `snapcal_exercises_list`, `snapcal_weight_history_*`).
- **Optimistic updates:** deletes remove immediately + revert on error; workout sets debounce-save 1s.
- **Mobile nav:** bottom nav + center FAB defined inline in `page.jsx` (NOT `BottomNav.jsx`, which is dead); FAB opens Framer Motion action sheet (Log Meal / Log Workout).
- **Theming:** `globals.css` has full shadcn token set incl. `.dark` block, but components hardcode light colors — dark mode is dead code.

## 7. Gaps & Rough Edges

**Missing features:** no food database integration (pure Gemini estimates); no recipes/social/wearables (README roadmap); no export; no notifications; pricing page has no payment flow.

**Code quality:**
- Tests: only 2 files, one a broken template — <10% coverage.
- Oversized components: WorkoutView 1,023 / AddFood 576 / HistoryView 475 / OnboardingForm 438 lines.
- 46 console.* calls in src/; no error boundaries; no TypeScript.
- **`supabase/migrations/` empty — schema not in source control (top gap).**
- Charts split-brain: WeightTrend uses Recharts, WeeklyTrend/MacroDistribution hand-rolled.
- localStorage blobs unbounded; no pagination on history; scanned images stored as large base64.
- Timezone/DST edge cases in `toLocaleDateString('en-CA')` date math; streak can break on timezone change mid-session.
- No password reset flow; no email-verification enforcement; no env validation at startup (missing GEMINI_API_KEY fails at first scan).
- Input validation: no min/max bounds on calories/weight (negative or absurd values accepted).
- Dead code: `components/ui/hero-section-2.jsx`, `components/BottomNav.jsx` (omits Workouts — divergence bug risk).

**Security:** RLS assumed but policies not in repo; client-side checks duplicated server-side for rate limits (good); anon key public as expected.

## 8. Quick Stats

~70 source files; 22 API endpoints; 28 components; ~6,850 lines total. Jest configured, effectively untested.

| Route | Methods | Purpose |
|---|---|---|
| /api/logs, /api/logs/[id] | GET POST PUT DELETE | food logs CRUD |
| /api/user/settings | GET POST | goals/profile + Mifflin-St Jeor calc |
| /api/daily-stats | GET POST | water, weight, AI usage counters |
| /api/gemini/analyze | POST | AI food scan (5/day) |
| /api/gemini/text | POST | suggestion/overview (1/day each) |
| /api/exercises | GET | public exercise list |
| /api/workouts/logs, /[id] | GET POST PUT DELETE | session + exercise CRUD |
| /api/workouts/finish | POST | close session, record duration |
| /api/workouts/templates | GET POST | routines |
| /api/workouts/history, /best, /last | GET | history, PRs, pre-fill |
