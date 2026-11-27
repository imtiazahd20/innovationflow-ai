# Changelog

The in-app Roadmap tab shows the same entries (from `src/lib/roadmap.ts`).

## 2026-11-27 — Workspaces and roles (Phase 3, first part)

- New database tables: `organizations`, `organization_members`, `organization_invites`
  (migration `20261127000000_organizations.sql`, rollback in `supabase/rollback/`).
- Every existing challenge owner got their own workspace as admin; all 6 live challenges moved in
  with no data changes (counts checked before and after).
- Security rules now grant challenge access to a workspace's admins and organisers.
- New page `/dashboard/organizations/[id]`: rename, members and roles, invite by email, cancel
  invitations, remove roles (the last admin can't be removed).
- New challenge form lets you pick the workspace when you manage more than one.
- Tests: `supabase/tests/org_check.sql` (35 checks) and the original `rls_check.sql` both pass on
  the live database; a local Postgres run also covers the backfill and the rollback.

## 2026-11-27 — Roadmap, AI drafting and a security update

- Added the **Roadmap** tab (`/roadmap`) and the prototype audit (`docs/`).
- **Draft with AI** writes a challenge's brief, judging criteria and timeline using Google Gemini's
  free tier. The answer is validated in code (weights total 100, dates within range) and a person
  reviews it before saving.
- Upgraded Next.js 16.4.3 → 16.4.6 to fix known security advisories.

## 2026-11-02 — Judging and discussion

- Judges score ideas on six weighted categories; totals and ranks are visible to everyone involved.
- Discussion threads with attachments for submitters, judges and the owner, refreshing every few seconds.
- Tab bar across a challenge's pages; ideas shown as cards with a pop-up.

## 2026-10-30 — Innovation Sprint Planner

- Sign in, create challenges, plan the brief, criteria and timeline, and publish a shareable link.
- Anyone with the link can submit an idea, no account needed.
