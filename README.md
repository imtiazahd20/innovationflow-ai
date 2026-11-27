# InnovationFlow AI

A web app that helps organizations plan innovation challenges, evaluate submissions,
and track winning ideas through to execution.

Three connected modules, built one at a time:

1. **Innovation Sprint Planner** (live, being extended)
2. AI Judge & Submission Copilot (human judging live; AI coming)
3. Innovation-to-Impact Tracker (planned)

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (auth + Postgres) · Claude API (server-side only) · Vitest

## Run it on your computer

```bash
npm install        # downloads the libraries listed in package.json (first time only)
npm run dev        # starts the app at http://localhost:3000
```

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Run the app while you work. It refreshes when you save a file. |
| `npm test` | Run the automated tests once. |
| `npm run lint` | Check the code for common mistakes. |
| `npm run typecheck` | Check that data types line up. |
| `npm run build` | Build the production version, the final check before deploying. |

## Secrets

Keys and passwords go in a file called `.env.local`, which Git ignores. Copy `.env.example`
to `.env.local` and fill it in. Never paste keys into chat, code or commits.

## AI drafting (free, Google Gemini)

On a challenge's **Brief, criteria and timeline** page, **Draft with AI** asks Google Gemini to
write the brief, judging criteria and timeline. The draft fills the editor; nothing is saved
until you press **Save plan**.

- Set `GEMINI_API_KEY` in `.env.local` (and in Vercel → Settings → Environment Variables for the
  live site). Get a free key at https://aistudio.google.com/apikey. Without it the button is hidden
  and **Draft from template** still works.
- Free tier: Google limits requests per minute and per day, and may use what is sent to improve its
  products. Only the challenge's title, problem, objectives, participants and deadline are sent.
- The code checks the AI's answer: weights always add up to 100 and dates stay between today and
  the deadline. Anything unusable falls back to the template. See `src/lib/plan/ai-draft.ts`.

## Roadmap and documents

- **In the app:** the **Roadmap** tab (`/roadmap`) shows every phase, what is done, what is next and
  what is waiting on a paid service. Its content lives in `src/lib/roadmap.ts`: update an item's status
  in the same commit that ships it, and add a changelog entry.
- **In `docs/`:**
  - `FEATURE_STATUS.md`: prototype audit, feature inventory, security findings, what to preserve
  - `DEVELOPMENT_ROADMAP.md`: approach, phases, first tasks, decisions needing approval
  - `TECHNICAL_ARCHITECTURE.md`: how the app fits together, and proposed changes
  - `DATABASE_SCHEMA.md`: current tables and proposed additions
  - `CHANGELOG.md`: what changed and when

Rule for now: **free tools and free tiers only.** Anything that costs money stays on the roadmap as
"Deferred" until it is worth paying for.
