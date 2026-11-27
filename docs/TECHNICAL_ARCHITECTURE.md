# Technical architecture

## 1. How it fits together today

```mermaid
flowchart LR
  Browser -->|pages, forms| Next["Next.js on Vercel\n(Server Components + Server Actions)"]
  Next -->|signed-in requests, RLS applies| DB[(Supabase Postgres)]
  Next -->|server only, key never in browser| Gemini[Google Gemini free tier]
  Browser -->|attachments| Storage[(Supabase Storage)]
  Proxy["src/proxy.ts\nsession refresh + redirects"] --> Next
```

- **Pages** read data in Server Components behind `<Suspense>` (required by Cache Components when a
  page reads the login cookie).
- **Changes** go through Server Actions, which re-check the user and validate input with Zod.
- **Security** lives in Postgres: Row Level Security on every table, and `security definer` functions
  (for example `submit_idea`, `get_judging`, `save_scores`) for the few things visitors or judges may do,
  each with its own explicit checks.
- **AI** runs only on the server. `src/lib/ai/gemini.ts` asks for JSON matching a schema; feature code
  (for example `src/lib/plan/ai-draft.ts`) then validates and corrects the answer before a person
  reviews it.

## 2. Folder map

| Folder | Holds |
|---|---|
| `src/app` | Pages and Server Actions, one folder per route |
| `src/components` | Shared UI (header, discussion board, dropdown, illustrations) |
| `src/lib/<area>` | Rules and helpers per area (plan, judging, ideas, discussion, ai, roadmap), each with tests |
| `supabase/migrations` | Database changes, in date order |
| `supabase/tests` | SQL security checks |
| `docs` | These documents |

## 3. Organisations and roles (Phase 3, applied 27 Nov 2026)

**Why:** every later feature belongs to an organisation and depends on who the person is there.

**What changed (additive only):**

1. New `organizations`, `organization_members (organization_id, user_id, role)` and
   `organization_invites` tables. Roles: `admin`, `organiser`, `judge`, `mentor`, `participant`,
   `project_owner`; a person can hold several. (A `platform_admins` table for the platform
   super-admin is still to come.)
2. New required `organization_id` on `challenges`, backfilled: each existing challenge owner got one
   workspace named after them, as `admin`, containing their challenges.
3. Security rules for challenges changed from "owner only" to "admins and organisers of the
   challenge's workspace". A trigger files any challenge created without a workspace into the
   creator's own, so older app code kept working during the deploy.
4. Existing judge invitations by email keep working unchanged.

**Rollback:** the old `owner_id` column stays, so the previous rules can be restored with
`supabase/rollback/20261127000000_organizations_down.sql` (tested).

**Decision made while building:** access comes from the organisation role, not from having created
the challenge. Every existing owner became admin of their own workspace, so nothing changed for them,
and removing someone from a workspace genuinely removes their access.

### Role and permission matrix

| Can… | Admin | Organiser | Judge | Mentor | Participant | Project owner | Challenge judge (invited by email) |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| See the workspace and its members | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| Rename the workspace, invite, remove roles | ✓ | – | – | – | – | – | – |
| Create, edit, publish, delete challenges | ✓ | ✓ | – | – | – | – | – |
| Read and delete ideas, manage challenge judges | ✓ | ✓ | – | – | – | – | – |
| Score ideas and comment on that challenge | ✓ | ✓ | later | – | – | – | ✓ |
| Mentor teams / submit as participant / run projects | – | – | – | later | later | later | – |

"Later" roles are stored now; their screens arrive in Phases 4–6.

## 4. Proposed: AI layer (Phase 7, started)

```
src/lib/ai/
  gemini.ts        provider client (done)
  provider.ts      common interface: generateJson(request) → result      (planned)
  usage.ts         log each call to ai_usage_logs, enforce per-organisation daily limits (planned)
features call:  ai.generateJson({ feature: "plan-draft", ... })
```

Rules: keys server-side only; structured output; validate before saving; human approval; loading,
error and retry states; record every evaluation (`ai_evaluations`).

## 5. Free-tier limits to design around

| Service | Free limit that matters |
|---|---|
| Supabase | 500 MB database, 1 GB files, project pauses after a week of no activity |
| Vercel Hobby | Non-commercial use only |
| Gemini free tier | Per-minute and per-day request caps; prompts may be used to improve Google's products |
| Supabase built-in email | Very low hourly limit; fine for sign-up confirmation, not for notifications |
