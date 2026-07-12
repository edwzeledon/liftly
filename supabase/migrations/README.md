# Supabase migrations

The baseline schema (`00000000000000_baseline.sql`) has been committed to version control and applied to the hosted project. The `20260711000001_lifter_first_columns.sql` migration has also been applied.

## Current schema

The database contains tables for: `logs`, `user_settings`, `daily_stats`,
`workout_sessions`, `workout_logs`, `exercises`, `workout_templates` — all
with Row-Level Security (RLS) policies enabled. See the baseline and migration
files for the current schema definition.

## Applying future migrations

To create a new migration:

### Option A: Supabase CLI (preferred)

```bash
npx supabase init
npx supabase login
npx supabase link
npx supabase db push
```

(Requires an access token from https://supabase.com/dashboard/account/tokens.)

### Option B: Supabase Studio SQL editor

Paste the migration SQL into the Supabase Studio SQL editor and run it.

### Verify

```sql
select column_name, column_default from information_schema.columns
where table_name = 'user_settings' and column_name like '%offset%';
```

Expected: two rows for `training_day_calorie_offset` and `rest_day_calorie_offset`, with defaults `250` and `0`.
