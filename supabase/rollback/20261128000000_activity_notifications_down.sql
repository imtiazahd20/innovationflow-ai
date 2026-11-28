-- Undo 20261128000000_activity_notifications.sql. Deletes the activity log and all notifications;
-- challenges, ideas, members and invitations are untouched.

begin;

drop trigger if exists challenges_activity on public.challenges;
drop trigger if exists ideas_activity on public.ideas;
drop trigger if exists members_activity on public.organization_members;
drop trigger if exists invites_activity on public.organization_invites;

drop function if exists public.challenges_activity();
drop function if exists public.ideas_activity();
drop function if exists public.members_activity();
drop function if exists public.invites_activity();
drop function if exists public.org_roles_label(text);
drop function if exists public.notify_roles(uuid, text[], text, text, text);
drop function if exists public.log_activity(uuid, text, text, text, text);

drop table if exists public.notifications;
drop table if exists public.activity_logs;

-- accept_org_invites keeps working: its extra set_config calls are harmless without the trigger.

commit;

notify pgrst, 'reload schema';
