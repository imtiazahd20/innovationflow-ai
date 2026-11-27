# Changelog

The in-app Roadmap tab shows the same entries (from `src/lib/roadmap.ts`).

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
