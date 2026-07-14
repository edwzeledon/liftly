-- supabase/migrations/20260713000001_weight_unit_water_goal.sql
alter table public.user_settings
  add column if not exists weight_unit text not null default 'lb',
  add column if not exists water_goal integer not null default 8;

alter table public.user_settings
  drop constraint if exists user_settings_weight_unit_check;

alter table public.user_settings
  add constraint user_settings_weight_unit_check check (weight_unit in ('lb', 'kg'));
