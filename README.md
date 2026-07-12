# Liftly — The Lifting App Where Nutrition Serves Your Training

Liftly is a strength-training app that makes it effortless to track workouts, fuel your training, and visualize progress. Every feature is built around one mission: help lifters train harder, smarter, and more consistently by removing friction from workout logging and nutrition tracking.

## Inspiration
I wanted to build something for lifters who already care about their training. Most fitness apps make you choose: do I track my workout or my nutrition? Liftly lets you do both seamlessly. Log a PR in seconds, snap your meal and get macros instantly, and never miss a day because the UI is faster than your phone’s camera app.

## What it does
Liftly integrates training and nutrition into a unified app designed for strength athletes:
*   **Workout Tracking with PR Detection:** Log exercises, sets, reps, and weight. The app auto-fills history and flags personal records to celebrate progress. Includes a plate calculator for barbell math.
*   **Quick Protein 2-Tap Logging:** Save preset meals (e.g., “Chicken + Rice + Broccoli”) and log protein intake in two taps. Editable presets let you adapt on the fly.
*   **Training-Day-Aware Nutrition Targets:** Automatically adjust calorie targets on training days (+250 kcal default). Skip or manually adjust the pill per session.
*   **Training × Nutrition Insights:** Weekly volume vs. protein chart, PRs on nutrition timeline, weight trend vs. calorie balance. Locked until 7 food-logged days to ensure data quality.
*   **Weekly AI Review:** Once per week, get a 4-part structured summary: training volume, fuel quality, weekly win, and one focus area.
*   **AI Food Scanning (Power Tool):** Snap a photo of your meal (5/day limit), and Gemini instantly returns calories and macros. Manual logging remains available.

## How I built it
*   **Next.js 15 (App Router) + React 19:** Full-stack framework handling frontend and server-side API routes. Server Actions power form submissions and database mutations.
*   **Google Gemini (3.5-flash, 2.5 fallback):** Multimodal vision model analyzing food images and returning structured JSON macros. Rate-limited to 5 scans/day server-side.
*   **Supabase (PostgreSQL + RLS):** Relational database for logs, workouts, daily stats, and user settings. Row-level security ensures users only access their own data.
*   **Tailwind CSS 4 + Framer Motion:** Mobile-first responsive styling with smooth animations on entry sheets, modals, and the hero ring.
*   **Recharts:** Data visualization for weekly volume charts, PR timelines, and weight trends.
*   **Jest:** 28 passing unit tests covering `workoutStats`, `streak`, and `insights` utilities.

## Challenges I ran into
*   **Prompt Engineering:** Tuning Gemini prompts to parse macros consistently without hallucinating ingredients—especially protein-heavy meals and prepared foods that don't have standard labels.
*   **Optimistic UI Updates:** Coordinating instant dashboard feedback (streak ring animations, calorie pie updates, weight chart) before server responses to keep the app snappy on mobile networks.
*   **Secure Rate Limiting:** Implementing database-backed rate limiting (5 AI scans/day) at the server layer to prevent client-side bypass, while keeping the UX frictionless on hits.

## Accomplishments that I'm proud of
*   **Sub-5-Second Meal Logging:** Image-to-structured-macros pipeline that gets from camera roll to dashboard in under 5 seconds—faster than searching a food database by hand.
*   **Database-Level Security:** Row-level security (RLS) policies ensuring users can *only* access their own data, even if the API were compromised. Schema migrations tracked in version control.
*   **Adaptive UI by Device:** The camera interface scales from desktop drag-and-drop to full-screen mobile native feel; insights charts reflow from overlays (desktop) to small multiples (375px mobile).

## What I learned
*   **Next.js Server Actions:** Deep experience building forms, database mutations, and AI calls server-side. RLS policies pair naturally with Server Actions—no separate API auth layer needed.
*   **Multimodal AI in Production:** How to structure prompts for consistent JSON output, handle image resize/quality tradeoffs, and implement tiered fallbacks (3.5-flash → 2.5 on quota).
*   **Training Data Visualization:** How lifters think about progress (PRs matter more than raw volume; weight trends need context). Charts need custom tooltips and mobile collapse strategies.

## What's next for Liftly
*   **Adaptive TDEE Coaching:** Track calorie vs. weight trends and auto-adjust TDEE targets to keep weight progress on track week-over-week.
*   **Quick Protein in FAB:** Mirror Quick Protein presets into a floating action button for one-tap logging from anywhere in the app.
*   **Wearable Integration:** Sync with Apple Health and Oura for sleep/HRV context on recovery and training readiness.

---

## Codebase & Architecture

See `docs/codebase-reference.md` for a guided tour of workoutStats, streak, and insights utilities. Design spec: `docs/superpowers/specs/2026-07-11-lifter-first-repositioning-design.md`. Full implementation plan: `docs/superpowers/plans/2026-07-11-lifter-first-repositioning.md`.
