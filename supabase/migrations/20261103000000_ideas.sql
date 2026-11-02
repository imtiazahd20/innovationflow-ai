-- InnovationFlow AI, Milestone 6: participants submit ideas to a published challenge.
--
-- Who can do what:
--   * Anyone with a published challenge's link can SUBMIT an idea, only through the function
--     submit_idea() below. The "anon" (not signed in) role gets NO direct access to the table.
--   * Only the challenge's owner can READ or DELETE its ideas (Row Level Security).
-- Submitter emails are therefore private to the owner.

create table public.ideas (
  id              uuid primary key default gen_random_uuid(),
  challenge_id    uuid not null references public.challenges (id) on delete cascade,
  submitter_name  text not null check (char_length(submitter_name)  between 2 and 100),
  submitter_email text not null check (char_length(submitter_email) between 5 and 254),
  title           text not null check (char_length(title)           between 3 and 200),
  description     text not null check (char_length(description)     between 20 and 5000),
  created_at      timestamptz not null default now()
);

create index ideas_challenge_id_idx on public.ideas (challenge_id, created_at desc);

alter table public.ideas enable row level security;

grant select, delete on public.ideas to authenticated;

create policy "Owners read ideas for their challenges"
  on public.ideas
  for select
  to authenticated
  using (exists (
    select 1 from public.challenges c
    where c.id = ideas.challenge_id and c.owner_id = (select auth.uid())
  ));

create policy "Owners delete ideas for their challenges"
  on public.ideas
  for delete
  to authenticated
  using (exists (
    select 1 from public.challenges c
    where c.id = ideas.challenge_id and c.owner_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------------------
-- submit_idea: the ONLY way a visitor can add an idea.
-- Returns a short status word the app turns into a message:
--   ok | not_found | closed | full | duplicate
-- "security definer" lets it insert even though visitors have no table rights; the checks
-- below decide exactly when that is allowed.
-- ---------------------------------------------------------------------------------------
create or replace function public.submit_idea(
  p_challenge_id uuid,
  p_name         text,
  p_email        text,
  p_title        text,
  p_description  text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deadline date;
  v_status   text;
begin
  select c.deadline, c.status into v_deadline, v_status
  from public.challenges c where c.id = p_challenge_id;

  if not found or v_status <> 'published' then
    return 'not_found';
  end if;
  if current_date > v_deadline then
    return 'closed';
  end if;
  if (select count(*) from public.ideas i where i.challenge_id = p_challenge_id) >= 500 then
    return 'full';
  end if;
  -- Same person sending the same title twice (for example a double click) counts once.
  if exists (
    select 1 from public.ideas i
    where i.challenge_id = p_challenge_id
      and lower(i.submitter_email) = lower(btrim(p_email))
      and lower(i.title) = lower(btrim(p_title))
  ) then
    return 'duplicate';
  end if;

  insert into public.ideas (challenge_id, submitter_name, submitter_email, title, description)
  values (p_challenge_id, btrim(p_name), btrim(p_email), btrim(p_title), btrim(p_description));
  return 'ok';
end;
$$;

revoke all on function public.submit_idea(uuid, text, text, text, text) from public;
grant execute on function public.submit_idea(uuid, text, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
