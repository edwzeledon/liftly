# Liftly - AI-Powered Nutrition Tracker

Liftly is an intelligent nutrition tracking application that simplifies the process of logging meals. By leveraging computer vision and AI, it transforms the tedious task of manual calorie counting into a seamless, single-step process.

## Inspiration
I wanted an easier way to track calories because its a pain by hand. Most calorie trackers make you search for ingredients, guess portion sizes, and log everything by hand. Liftly solves that by “seeing” your food and logging it automatically, so hitting your nutrition goals doesn’t feel like a chore.

## What it does
Liftly provides a comprehensive dashboard for tracking daily nutrition and fitness.
*   **AI Food Scanning:** Users can snap a photo of their meal, and the app automatically identifies the food, estimates portion sizes, and calculates calories and macros (Protein, Carbs, Fats).
*   **Workout Tracking:** A complete workout logger allowing users to track exercises, sets, reps, and weight, with features like history pre-filling to ensure progressive overload.
*   **Gamified Consistency:** A streak system that tracks consecutive days of logging to keep users motivated and accountable.
*   **Smart Dashboard:** Visualizes daily progress with dynamic circular charts for calories and macros.
*   **Intelligent Insights:** Offers "Chef's Suggestions" for healthy meal ideas based on remaining macro goals and a "Daily Overview" that analyzes eating patterns.
*   **Secure Tracking:** Keeps a secure, persistent history of all logs, workouts, and user settings.

## How I built it
*   **Next.js 14 (App Router):** Serves as the full-stack framework, handling both the React frontend and server-side API routes for optimal performance.
*   **Google Gemini Vision API:** The core intelligence engine that analyzes food images and returns structured nutritional JSON data.
*   **Supabase (PostgreSQL):** Manages the relational database for user logs and settings, utilizing Row Level Security (RLS) for robust data privacy.
*   **Tailwind CSS:** Used for styling a responsive, mobile-first interface with a clean, modern aesthetic.
*   **Framer Motion:** Powers the smooth animations and transitions, particularly in the authentication and modal interfaces.

## Challenges I ran into
*   **Prompt Engineering:** Fine-tuning the Gemini API prompts to consistently return valid JSON without hallucinating non-existent ingredients was a significant iteration process.
*   **State Management:** Coordinating the optimistic UI updates (updating the dashboard immediately before the server responds) to ensure the app felt instant and responsive.
*   **Rate Limiting:** Implementing a secure, database-backed rate limiting system to restrict expensive AI calls (3 scans/day) without relying solely on client-side logic.

## Accomplishments that I'm proud of
*   **Seamless Image-to-Data Pipeline:** Successfully reducing the time it takes to log a complex meal from ~45 seconds to under 5 seconds.
*   **Security First:** Implementing strict Row Level Security (RLS) policies that ensure users can strictly only access their own data, even if the API layer were compromised.
*   **Mobile-First Design:** Creating a "floating card" interface for the camera that adapts perfectly from desktop drag-and-drop to a native-feeling mobile full-screen experience.

## What I learned
*   **Server Actions:** Gained deep experience in using Next.js Server Actions to handle form submissions and database mutations securely.
*   **AI Integration:** Learned the nuances of working with multimodal AI models (text + image) and how to handle non-deterministic outputs in a structured application.
*   **Database Design:** Reinforced the importance of normalized schemas and database-level security policies.

## What's next for Liftly
*   **Recipe Generation:** Expanding the "Chef's Suggestion" to generate full shopping lists and step-by-step recipes.
*   **Social Features:** Allowing users to share meal photos and progress with friends for accountability.
*   **Wearable Integration:** Syncing data with Apple Health and Google Fit.
