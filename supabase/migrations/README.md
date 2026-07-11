# Supabase migrations — owner setup required

`supabase/migrations/` currently has no baseline: the hosted DB is the only
source of truth for the existing schema. This repo has no
`supabase/config.toml`, so the Supabase CLI is not linked to the hosted
project and cannot be linked without the project owner's credentials. The
steps below **must be run by the repo owner** (someone with access to the
hosted Supabase project) before the migration in this directory can be
applied.

## Step 1 — Export the baseline schema

### Option A: Supabase CLI (preferred)

```bash
npx supabase login
npx supabase link
npx supabase db dump --schema public -f supabase/migrations/00000000000000_baseline.sql
```

`npx supabase link` will prompt you to select the hosted project. This
requires an access token from https://supabase.com/dashboard/account/tokens.

### Option B: Supabase Studio (fallback, if the CLI can't be linked)

1. Open the hosted project in Supabase Studio.
2. Go to **Database → Schema Visualizer**, and use the export/definition
   view, or open **Database → Tables**, select each table, and copy the
   "Definition" tab SQL.
3. Go to **Authentication → Policies**, open each table, and copy the RLS
   policy definitions (or use the "..." menu on each table in
   **Database → Tables** to view/copy policies).
4. Assemble the collected `create table` statements plus all RLS policies
   (`alter table ... enable row level security;` and `create policy ...`
   statements) into `supabase/migrations/00000000000000_baseline.sql`.

Either way, the resulting `00000000000000_baseline.sql` **must** contain
`create table` statements for: `logs`, `user_settings`, `daily_stats`,
`workout_sessions`, `workout_logs`, `exercises`, `workout_templates` — and
their RLS policies. Do not guess columns; copy them from the live DB.

## Step 2 — New-columns migration (already done)

`supabase/migrations/20260711000001_lifter_first_columns.sql` in this
directory adds four new columns to `user_settings`:
`training_day_calorie_offset`, `rest_day_calorie_offset`,
`last_weekly_review`, `weekly_review_content`. No action needed for this
file — it's ready to apply once the baseline exists (Step 1) and the CLI is
linked, or it can be applied directly (see Step 3).

## Step 3 — Apply the new-columns migration to the dev database

### Option A: Supabase CLI

```bash
npx supabase db push
```

(Requires `npx supabase link` from Step 1 to have been run.)

### Option B: Supabase Studio SQL editor

Paste the contents of
`supabase/migrations/20260711000001_lifter_first_columns.sql` into the SQL
editor and run it.

### Verify

```sql
select column_name, column_default from information_schema.columns
where table_name = 'user_settings' and column_name like '%offset%';
```

Expected: two rows, defaults `250` and `0`.
