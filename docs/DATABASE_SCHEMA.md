# Database schema

Source of truth: `supabase/migrations/*.sql`. Every table has Row Level Security turned on.

## 1. Current tables

```mermaid
erDiagram
  auth_users ||--o{ challenges : owns
  challenges ||--o{ judging_criteria : "scored by"
  challenges ||--o{ timeline_phases : "runs through"
  challenges ||--o{ ideas : receives
  challenges ||--o{ challenge_judges : invites
  ideas ||--o{ idea_scores : "scored in"
  judging_criteria ||--o{ idea_scores : "per criterion"
  ideas ||--o{ idea_comments : "discussed in"
```

| Table | Purpose | Who can access |
|---|---|---|
| `challenges` | One innovation challenge: problem, objectives, participants, deadline, brief, `draft`/`published` | Owner only; public reads via `get_public_challenge()` for published ones |
| `judging_criteria` | Weighted criteria (weights total 100) | Owner |
| `timeline_phases` | Dated phases | Owner |
| `ideas` | Submissions (name, email, title, description, private `thread_token`) | Owner reads/deletes; visitors insert only via `submit_idea()` |
| `challenge_judges` | Judges invited by email | Owner |
| `idea_scores` | One score 0–10 per idea × criterion × judge | Only through `get_judging()` / `save_scores()` |
| `idea_comments` | Discussion messages with up to 3 attachments | Only through `get_discussion()` / `post_comment()` |

Key functions: `get_public_challenge`, `submit_idea`, `judging_role`, `get_judging`, `save_scores`,
`my_judging_challenges`, `idea_totals`, `discussion_viewer`, `get_discussion`, `post_comment`,
`delete_comment`, `upload_path_ok`. Storage bucket: `idea-files`.

## 2. Proposed additions (not applied yet)

These reuse and extend the tables above; nothing is renamed or removed.

| Phase | New or changed | Notes |
|---|---|---|
| 3 | `organizations`, `organization_members`, `platform_admins`; `challenges.organization_id` | See TECHNICAL_ARCHITECTURE.md §3 |
| 3 | `notifications`, `activity_logs` | In-app only |
| 4 | `innovation_programs`; `challenges.program_id`, `format`, `event_*` fields, wider `status` | Hackathon = challenge with a format |
| 4 | `registrations`, `participant_profiles`, `teams`, `team_members`, `mentor_assignments`, `mentoring_sessions` | |
| 5 | `ideas` gains `team_id`, `solution`, `category`, `links`, `status`, `updated_at`; `idea_files` | Submissions stay in `ideas` |
| 5 | `judge_assignments`, `conflict_declarations`, `ai_evaluations`, `awards` | AI scores kept separate from human scores |
| 6 | `pipeline_stages`, `innovation_projects`, `project_members`, `milestones`, `tasks`, `experiments`, `impact_metrics` | Impact has `estimated` and `verified` values |
| 7 | `ai_usage_logs` | Per-organisation daily limits |
| 9 | `plans`, `subscriptions` | Prices configurable, nothing hard-coded |
