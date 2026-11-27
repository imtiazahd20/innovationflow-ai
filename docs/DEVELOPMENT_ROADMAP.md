# Development roadmap

The live version of this roadmap is the **Roadmap** tab in the app (`/roadmap`), generated from
`src/lib/roadmap.ts`. This document explains the approach and the order of work.

## Ground rules

1. **Free tools only for now.** Anything that costs money stays on the roadmap as "Deferred" with a
   note on what it needs (see the bottom of this file).
2. **Evolve, don't replace.** Extend existing tables and pages; no new template, no duplicate pages.
3. **Nothing destructive without approval.** Database changes are additive (new tables, new
   nullable columns, then backfill). No data is deleted or reset.
4. **Small, testable steps.** Each task ships on its own with tests, and the roadmap item flips to
   "Done" in the same commit.
5. **AI assists, humans decide.** AI output is validated in code and always reviewed before saving;
   AI never declares winners.

## Recommended technical approach

- **Organisations first.** Every later feature (programmes, hackathons, mentors, projects, analytics)
  belongs to an organisation and depends on roles. Building them first avoids reworking security later.
- **One challenge model, not two.** A hackathon is a challenge with a `format` and event details,
  rather than a separate "events" system, so participants, submissions and judging stay shared.
- **Extend `ideas` into submissions.** Add fields (solution, category, team, links, status) to the
  existing table rather than creating a parallel `submissions` table; the UI can call them submissions.
- **One AI layer.** Every AI feature goes through `src/lib/ai`, which logs usage, enforces limits and
  can switch providers.
- **Security stays in the database.** New tables get RLS based on organisation membership and role.

## Phases and the first small tasks

| Phase | First tasks (each one shippable and testable) |
|---|---|
| 1. Audit | ✅ Feature inventory, gap analysis, security review, Roadmap tab |
| 2. Architecture | ✅ Technical architecture and database docs · ➡️ PRD, role and permission matrix, user journeys |
| 3. Core platform | ➡️ `organizations` + `organization_members` tables · backfill one workspace per existing user · switch challenge access to membership · invite colleagues · app navigation · private file links · Supabase CLI migrations |
| 4. Sprint Planner | Lifecycle statuses · programmes · event formats and event page · full AI Challenge Generator · registration and profiles · teams · AI team matching · mentors · CSV export |
| 5. AI Judge & Copilot | Richer submissions · edit until deadline · AI Submission Copilot · AI Judge with evidence and confidence · AI vs human comparison · assignments and conflicts of interest · private leaderboard · winners and showcase |
| 6. Impact Tracker | Pipeline stages · convert idea to project · project workspace · experiments · estimated vs verified impact and ROI · AI advisor |
| 7. AI layer | Provider abstraction · usage log and limits · evaluation log · report generator |
| 8. Analytics | Role dashboards · hackathon analytics · impact reports · CSV and printable exports |
| 9. SaaS and integrations | Configurable plans and limits · Stripe test-mode billing · Slack/Teams webhooks · calendar files · GitHub links · free-tier email |
| 10. Testing | Browser tests for the five workflows (Playwright) · responsive checks |

## Decision needed before Phase 3

Phase 3 adds an organisation layer to the live database. It is additive and keeps every existing
challenge, idea, score and comment, but it changes **who can see what**, so it needs the owner's
go-ahead. See `TECHNICAL_ARCHITECTURE.md` §3 and `DATABASE_SCHEMA.md` §2 for the exact plan.

## Deferred: needs a paid service

| Item | Needs |
|---|---|
| Higher AI limits, prompts not used for training | Gemini paid tier |
| Taking real payments | Stripe fees and a business account |
| Commercial hosting | Vercel Pro (Hobby is non-commercial) |
| Database that never pauses, daily backups | Supabase Pro |
| Enterprise SSO (SAML) | Supabase Pro or above |
| Custom domain and branded email | Domain registration |
