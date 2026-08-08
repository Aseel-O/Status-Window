-- Status Window — schema (Phase 1, v2: flexible metric types + Religion stat)
-- Run this once in your Supabase project's SQL editor (Database > SQL Editor).
-- Safe to re-run, and safe to run over the original v1 schema — it migrates
-- existing columns forward instead of dropping anything.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────
-- stats: one row per user per stat, running point total
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stat_name text not null,
  points numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, stat_name)
);

-- ─────────────────────────────────────────────────────────────────────────
-- task_templates: reusable loggable tasks
--
-- metric_type controls how the task is logged and scored:
--   'duration' — minutes (workouts, thesis writing sessions, ...)
--   'count'    — a plain count (glasses of water, prayers, Quran pages, ...)
--   'words'    — word count (thesis writing measured by output, not time)
--   'stage'    — a milestone reached from an ordered `stages` list
--                (projects: Research -> Draft -> Revision -> Submitted)
-- 'duration' | 'count' | 'words' all share the same non-linear amount curve
-- (see src/lib/scoring.js:amountFactor) — only the unit label differs.
-- 'stage' is scored as the point delta between the previously-reached stage
-- and the newly-reached one (see src/lib/scoring.js:calculateStagePoints).
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.task_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  base_points numeric not null default 10,
  metric_type text not null default 'duration' check (metric_type in ('duration', 'count', 'words', 'stage')),
  unit_label text not null default 'min', -- e.g. 'min', 'glasses', 'pages', 'verses', 'meals', 'words'
  optimal_min numeric not null default 20, -- meaning depends on metric_type; unused for 'stage'
  optimal_max numeric not null default 60,
  stages jsonb, -- for metric_type='stage': [{"name":"Research","points":20}, ...], increasing points
  stage_index integer not null default -1, -- highest stage index reached so far, -1 = none
  stat_split jsonb not null default '{}'::jsonb, -- e.g. {"Intelligence": 70, "Mentality": 30}
  streak_habit text, -- optional: links this template to a streaks.habit_name
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migrate a v1 install forward (renames only run if the old column exists
-- and the new one doesn't yet — safe no-op on a fresh install).
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'task_templates' and column_name = 'optimal_min_minutes')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'task_templates' and column_name = 'optimal_min') then
    alter table public.task_templates rename column optimal_min_minutes to optimal_min;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'task_templates' and column_name = 'optimal_max_minutes')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'task_templates' and column_name = 'optimal_max') then
    alter table public.task_templates rename column optimal_max_minutes to optimal_max;
  end if;
end $$;

alter table public.task_templates add column if not exists metric_type text not null default 'duration';
alter table public.task_templates add column if not exists unit_label text not null default 'min';
alter table public.task_templates add column if not exists stages jsonb;
alter table public.task_templates add column if not exists stage_index integer not null default -1;
-- add the check constraint separately so re-running this script doesn't error if it already exists
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'task_templates_metric_type_check'
  ) then
    alter table public.task_templates
      add constraint task_templates_metric_type_check
      check (metric_type in ('duration', 'count', 'words', 'stage'));
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- logs: one row per completed/logged task
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_template_id uuid references public.task_templates(id) on delete set null,
  task_name text not null, -- denormalized so history survives template edits/deletes
  metric_type text not null default 'duration',
  amount numeric, -- minutes / count / words logged; null for 'stage' entries
  unit_label text, -- denormalized copy of the template's unit at log time
  stage_name text, -- for 'stage' entries: the stage reached
  difficulty smallint not null default 3 check (difficulty between 1 and 5),
  occurred_at timestamptz not null default now(),
  points_awarded numeric not null default 0,
  stat_split_applied jsonb not null default '{}'::jsonb,
  evidence_url text, -- nullable, used from Phase 2 onward
  ai_scored boolean not null default false, -- used from Phase 3 onward
  created_at timestamptz not null default now()
);

-- Migrate a v1 install forward.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'logs' and column_name = 'duration_minutes')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'logs' and column_name = 'amount') then
    alter table public.logs rename column duration_minutes to amount;
  end if;
end $$;

alter table public.logs add column if not exists metric_type text not null default 'duration';
alter table public.logs add column if not exists unit_label text;
alter table public.logs add column if not exists stage_name text;
alter table public.logs alter column amount drop not null;

create index if not exists logs_user_occurred_idx on public.logs (user_id, occurred_at desc);

-- ─────────────────────────────────────────────────────────────────────────
-- streaks: one row per user per named habit
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_name text not null,
  current_streak integer not null default 0,
  freezes_available integer not null default 1,
  last_completed_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, habit_name)
);

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security — every table is single-owner (user_id = auth.uid())
-- ─────────────────────────────────────────────────────────────────────────
alter table public.stats enable row level security;
alter table public.task_templates enable row level security;
alter table public.logs enable row level security;
alter table public.streaks enable row level security;

drop policy if exists "own rows only" on public.stats;
create policy "own rows only" on public.stats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows only" on public.task_templates;
create policy "own rows only" on public.task_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows only" on public.logs;
create policy "own rows only" on public.logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows only" on public.streaks;
create policy "own rows only" on public.streaks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Seed the 8 stats (including Religion) + starter templates covering every
-- metric type, the first time a user signs up.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.stats (user_id, stat_name)
  values
    (new.id, 'Intelligence'),
    (new.id, 'Wealth'),
    (new.id, 'Creativity'),
    (new.id, 'Mentality'),
    (new.id, 'Religion'),
    (new.id, 'Health'),
    (new.id, 'Strength'),
    (new.id, 'Agility')
  on conflict (user_id, stat_name) do nothing;

  insert into public.task_templates
    (user_id, name, base_points, metric_type, unit_label, optimal_min, optimal_max, stat_split, streak_habit)
  values
    (new.id, 'Thesis writing', 14, 'words', 'words', 300, 800, '{"Intelligence":70,"Mentality":30}'::jsonb, 'thesis'),
    (new.id, 'Freelance / Upwork work', 12, 'duration', 'min', 30, 90, '{"Wealth":90,"Intelligence":10}'::jsonb, 'freelance'),
    (new.id, 'Strength workout', 10, 'duration', 'min', 20, 50, '{"Strength":90,"Mentality":10}'::jsonb, 'exercise'),
    (new.id, 'Cardio / sport', 10, 'duration', 'min', 15, 40, '{"Agility":90,"Health":10}'::jsonb, 'exercise'),
    (new.id, 'Drink water', 3, 'count', 'glasses', 6, 8, '{"Health":100}'::jsonb, 'water'),
    (new.id, 'Eat a healthy meal', 5, 'count', 'meals', 2, 3, '{"Health":100}'::jsonb, 'healthy-eating'),
    (new.id, 'Pray', 4, 'count', 'prayers', 5, 5, '{"Religion":100}'::jsonb, 'prayer'),
    (new.id, 'Read Quran', 6, 'count', 'pages', 3, 10, '{"Religion":90,"Mentality":10}'::jsonb, 'quran'),
    (new.id, 'Reflection / meditation', 6, 'duration', 'min', 5, 20, '{"Mentality":100}'::jsonb, 'reflection')
  on conflict do nothing;

  -- Example stage-based project template — edit the stage list in Settings
  -- to match your actual thesis/freelance project milestones.
  insert into public.task_templates
    (user_id, name, base_points, metric_type, stat_split, streak_habit, stages)
  values
    (new.id, 'Thesis milestones', 0, 'stage', '{"Intelligence":80,"Creativity":20}'::jsonb, null,
     '[
        {"name":"Proposal drafted","points":40},
        {"name":"Literature review done","points":90},
        {"name":"Methodology / pipeline built","points":160},
        {"name":"Results collected","points":230},
        {"name":"Full draft written","points":300},
        {"name":"Defended / submitted","points":400}
      ]'::jsonb)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- Atomic point increment — avoids read-modify-write races when a single log
-- splits points across multiple stats.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.increment_stat_points(p_stat_name text, p_delta numeric)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.stats
  set points = points + p_delta, updated_at = now()
  where user_id = auth.uid() and stat_name = p_stat_name;
end;
$$;

grant execute on function public.increment_stat_points(text, numeric) to authenticated;
