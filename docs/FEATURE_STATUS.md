# Feature status and prototype audit

_Audit date: 27 Nov 2026 · code at commit `56d7b59` · live at innovationflow-ai.vercel.app_

This is the Phase 1 audit from the master instruction: what exists today, how well it works,
and how far it is from the full product vision. The in-app **Roadmap** tab (`/roadmap`) tracks
the same items; its data lives in `src/lib/roadmap.ts`.

## 1. What the prototype is built on

| Layer | Today | Keep? |
|---|---|---|
| Framework | Next.js 16.4.6 (App Router, Cache Components, Server Actions), React 19.3, TypeScript (strict) | Keep |
| Styling | Tailwind CSS 4 with a custom "sticker" palette (`flow-*` colours, chunky display font, 4px ink borders) | Keep: it is the product's identity |
| Database | Supabase Postgres, 7 migrations, Row Level Security on every table | Keep and extend |
| Auth | Supabase Auth, email + password, **email confirmation on** | Keep; add organisations and roles on top |
| Files | Supabase Storage bucket `idea-files` (5 MB, typed whitelist) | Keep, but make private (see §4) |
| AI | Google Gemini free tier, server-only, structured JSON (`src/lib/ai/gemini.ts`) | Keep; generalise into an AI layer |
| Tests | Vitest, 129 unit tests; SQL security test `supabase/tests/rls_check.sql` | Keep; add browser tests |
| Hosting | Vercel Hobby, auto-deploy from GitHub `main` | Keep for now (see deferred items) |

Size: about 7,700 lines across 70 source files. Code quality is high: small modules, plain-English
comments, validation shared between browser and server, security enforced in the database.

## 2. Feature inventory

### Working

| Feature | Where |
|---|---|
| Sign up / sign in / sign out, email confirmation, protected dashboard | `src/app/login`, `src/proxy.ts` |
| Create, edit, delete challenges (title, problem, objectives, participants, deadline) | `src/app/dashboard/challenges` |
| Plan editor: brief, weighted judging criteria (must total 100), timeline phases | `…/[id]/plan` |
| Draft the plan from a template | `src/lib/plan/draft.ts` |
| Draft the plan with AI (Gemini); validated and corrected before it reaches the editor | `src/lib/plan/ai-draft.ts` — needs `GEMINI_API_KEY` on Vercel to appear live |
| Publish / unpublish; read-only public page by link (no public listing) | `get_public_challenge()`, `src/app/c/[id]` |
| Public idea submission without an account (deadline, 500-idea cap, duplicate and bot checks) | `submit_idea()` |
| Private discussion link per idea; threads between submitter, judges and owner; up to 3 attachments; auto-refresh | `idea_comments`, `src/components/discussion` |
| Invite judges by email; judges see the challenge on their dashboard | `challenge_judges` |
| Score each idea 0–10 per criterion; weighted per-judge totals, averaged; shared ranks | `save_scores()`, `idea_totals()` |
| Six default scoring categories | migration `…six_criteria.sql` |
| Marketing home page | `src/app/page.tsx` |
| Roadmap tab with progress and changelog | `src/app/roadmap` |

### Partially working

| Area | What exists | What is missing |
|---|---|---|
| AI Challenge Generator | AI writes brief, criteria, timeline | Title, eligibility, team structure, submission requirements, rubric detail, messages, success metrics; per-section regenerate |
| Challenge lifecycle | `draft`, `published` | `active`, `completed`, `archived` |
| Event timeline | Editable phases | Event formats, schedule page, countdown, FAQ, rules, announcements |
| Submissions | Name, email, title, description; attachments only through comments | Solution, category, team, links, files, status, edit until deadline |
| Judging | Owner invites judges; independent scores | Assignments, expertise, conflict-of-interest, completion status, private leaderboard, winners |
| Roles | Owner, judge (by email), submitter (by private link) | Organisation roles: admin, organiser, mentor, participant, project owner, super admin |
| AI layer | One Gemini client | Provider abstraction, usage log, limits, evaluation log |

### Not implemented

Organisations and multi-tenancy · innovation programmes · registration and participant profiles ·
teams and AI team matching · mentors · AI Submission Copilot · AI Judge · AI vs human comparison ·
winners, showcase, certificates · innovation pipeline · project conversion and workspaces ·
milestones and tasks · experiments · business impact and ROI · role dashboards · analytics and
exports · notifications · activity/audit log · AI usage limits · plans and billing · integrations.

## 3. Gap summary by module

| Module | Coverage today | Biggest gaps |
|---|---|---|
| Core platform | Auth and per-user security | Organisations, roles, navigation, notifications, audit log |
| 1. Innovation Sprint Planner | ~35%: challenge + plan + publish + AI draft | Programmes, hackathon events, registration, teams, mentors |
| 2. AI Judge & Submission Copilot | ~30%: submissions, discussion, human scoring, ranking | AI Judge, copilot, comparison, assignments, winners |
| 3. Innovation-to-Impact Tracker | 0% | Everything |
| Analytics & SaaS | 0% | Dashboards, exports, plans, limits |

## 4. Security and technical-debt findings

| # | Finding | Risk | Recommendation |
|---|---|---|---|
| 1 | Attachment bucket is **public**; files are protected only by unguessable paths, forever | Medium: a forwarded link leaks a private file | Make the bucket private and serve short-lived signed links (free) |
| 2 | Judge access matches the signed-in email | Low: safe because email confirmation is on (verified) | Keep confirmation on; move judges into organisation roles in Phase 3 |
| 3 | Database changes applied by hand (Supabase shows "No migrations") | Medium: production and repo can drift | Track with the free Supabase CLI |
| 4 | No lockfile in git | Low: builds can pick up new library versions unexpectedly | Commit `package-lock.json` (decision for the owner) |
| 5 | No limit on AI calls per user | Low now (free tier caps it) | AI usage log and daily limits (Phase 7) |
| 6 | Public idea form relies on a honeypot and caps | Low | Add per-IP rate limiting if spam appears (free, in the database) |
| 7 | Single-owner model | Product gap | Organisations and roles (Phase 3) |
| 8 | README milestones out of date | Low | Updated in this change |
| 9 | Next.js 16.4.3 had known advisories | Fixed | Upgraded to 16.4.6 |

## 5. What to preserve

- The whole visual design: palette, display font, sticker cards, header, home page.
- Database-enforced security: RLS plus narrow `security definer` functions with explicit checks.
- Shared validation (Zod) used by both forms and server actions.
- Public idea submission without accounts, and private discussion links.
- The scoring model (weighted per-judge totals averaged, shared ranks) and its tests.
- Existing data: 6 challenges, their ideas, scores and comments. No resets.
