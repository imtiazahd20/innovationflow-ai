-- InnovationFlow AI, Milestone 1: the tables for the Innovation Sprint Planner.
--
-- Three tables:
--   challenges        one row per innovation challenge
--   judging_criteria  how entries will be scored (many per challenge)
--   timeline_phases   the event timeline (many per challenge)
--
-- Security model: every challenge belongs to one user (owner_id). Row Level Security (RLS)
-- makes the database itself refuse to show or change anyone else's rows, even if the app
-- code has a bug. The "anon" role (not signed in) gets no access at all.

-- ---------------------------------------------------------------------------------------
-- Helper: keep updated_at accurate without relying on app code.
-- ---------------------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------------------
-- challenges
-- ---------------------------------------------------------------------------------------
create table public.challenges (
  id                  uuid primary key default gen_random_uuid(),
  -- Filled in automatically with the signed-in user. Deleting the user deletes their data.
  owner_id            uuid not null default auth.uid()
                        references auth.users (id) on delete cascade,
  title               text not null check (char_length(title) between 3 and 200),
  business_problem    text not null check (char_length(business_problem) between 10 and 5000),
  objectives          text not null check (char_length(objectives) between 3 and 5000),
  target_participants text not null check (char_length(target_participants) between 3 and 1000),
  deadline            date not null,
  -- The AI-drafted brief. Empty until the person generates one.
  brief               text check (char_length(brief) <= 20000),
  status              text not null default 'draft' check (status in ('draft', 'published')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index challenges_owner_id_idx on public.challenges (owner_id, created_at desc);

create trigger challenges_set_updated_at
  before update on public.challenges
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------------------
-- judging_criteria
-- ---------------------------------------------------------------------------------------
create table public.judging_criteria (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 200),
  description  text check (char_length(description) <= 2000),
  -- Percent of the total score. The app checks that a challenge's weights add up to 100.
  weight       integer not null check (weight between 0 and 100),
  position     integer not null default 0,
  created_at   timestamptz not null default now()
);

create index judging_criteria_challenge_id_idx on public.judging_criteria (challenge_id, position);

-- ---------------------------------------------------------------------------------------
-- timeline_phases
-- ---------------------------------------------------------------------------------------
create table public.timeline_phases (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 200),
  description  text check (char_length(description) <= 2000),
  starts_on    date not null,
  ends_on      date not null,
  position     integer not null default 0,
  created_at   timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create index timeline_phases_challenge_id_idx on public.timeline_phases (challenge_id, position);

-- ---------------------------------------------------------------------------------------
-- Security: turn on RLS, then allow signed-in users to work only with their own rows.
-- ---------------------------------------------------------------------------------------
alter table public.challenges       enable row level security;
alter table public.judging_criteria enable row level security;
alter table public.timeline_phases  enable row level security;

-- Only signed-in users ("authenticated") get table access. "anon" gets none.
grant select, insert, update, delete on public.challenges       to authenticated;
grant select, insert, update, delete on public.judging_criteria to authenticated;
grant select, insert, update, delete on public.timeline_phases  to authenticated;

-- (select auth.uid()) is written in brackets so Postgres evaluates it once per query.
create policy "Owners manage their challenges"
  on public.challenges
  for all
  to authenticated
  using      (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Owners manage criteria of their challenges"
  on public.judging_criteria
  for all
  to authenticated
  using (exists (
    select 1 from public.challenges c
    where c.id = judging_criteria.challenge_id and c.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.challenges c
    where c.id = judging_criteria.challenge_id and c.owner_id = (select auth.uid())
  ));

create policy "Owners manage timeline of their challenges"
  on public.timeline_phases
  for all
  to authenticated
  using (exists (
    select 1 from public.challenges c
    where c.id = timeline_phases.challenge_id and c.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.challenges c
    where c.id = timeline_phases.challenge_id and c.owner_id = (select auth.uid())
  ));
