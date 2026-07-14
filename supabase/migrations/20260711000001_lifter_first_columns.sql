alter table public.user_settings
  add column if not exists training_day_calorie_offset integer not null default 250,
  add column if not exists rest_day_calorie_offset integer not null default 0,
  add column if not exists last_weekly_review date,
  add column if not exists weekly_review_content jsonb;
