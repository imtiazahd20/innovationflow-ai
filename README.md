# InnovationFlow AI

A web app that helps organizations plan innovation challenges, evaluate submissions,
and track winning ideas through to execution.

Three connected modules, built one at a time:

1. **Innovation Sprint Planner** (in progress)
2. AI Judge & Submission Copilot (planned)
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

## Milestones

- [x] **0. Foundation:** project runs, tests pass, production build works
- [ ] 1. Auth and protected dashboard (Supabase)
- [ ] 2. Create and list challenges
- [ ] 3. Open, edit and delete challenges
- [ ] 4. AI brief generation
- [ ] 5. AI judging criteria and timeline
- [ ] 6. Regenerate, hardening and polish
