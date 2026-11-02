// Judging rules in plain TypeScript, so they can be tested without a database.
// Scores are whole numbers from 0 to 10. Each criterion has a weight (percent).

import { z } from "zod";

export const SCORE_MIN = 0;
export const SCORE_MAX = 10;

export type Criterion = { id: string; name: string; description: string | null; weight: number };
export type JudgingIdea = { id: string; submitter_name: string; title: string; description: string; created_at: string };
export type Score = { idea_id: string; criterion_id: string; judge_id: string; score: number };
export type JudgeInvite = { id: string; email: string };
export type JudgingData = {
  role: "owner" | "judge";
  challenge: { id: string; title: string; status: string };
  criteria: Criterion[];
  ideas: JudgingIdea[];
  scores: Score[];
  judges: JudgeInvite[];
};

const dataSchema = z.object({
  role: z.enum(["owner", "judge"]),
  challenge: z.object({ id: z.string(), title: z.string(), status: z.string() }),
  criteria: z.array(
    z.object({ id: z.string(), name: z.string(), description: z.string().nullable(), weight: z.number() }),
  ),
  ideas: z.array(
    z.object({
      id: z.string(),
      submitter_name: z.string(),
      title: z.string(),
      description: z.string(),
      created_at: z.string(),
    }),
  ),
  scores: z.array(
    z.object({ idea_id: z.string(), criterion_id: z.string(), judge_id: z.string(), score: z.number() }),
  ),
  judges: z.array(z.object({ id: z.string(), email: z.string() })),
});

// Turns what the database function returned into a typed value, or null if it is not
// the expected shape (or the person has no access, when the database returns null).
export function parseJudging(data: unknown): JudgingData | null {
  const parsed = dataSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

// Reads the score fields of a form: one field per criterion, named "score_<criterion id>".
// Empty fields are skipped (a judge may score some criteria now and the rest later).
export function parseScoreForm(
  formData: FormData,
  criteria: Pick<Criterion, "id">[],
): { ok: true; scores: Record<string, number> } | { ok: false; error: string } {
  const scores: Record<string, number> = {};
  for (const c of criteria) {
    const raw = formData.get(`score_${c.id}`);
    if (typeof raw !== "string" || raw.trim() === "") continue;
    if (!/^\d{1,2}$/.test(raw.trim())) return { ok: false, error: "Scores must be whole numbers from 0 to 10." };
    const n = Number(raw.trim());
    if (n < SCORE_MIN || n > SCORE_MAX) return { ok: false, error: "Scores must be whole numbers from 0 to 10." };
    scores[c.id] = n;
  }
  if (Object.keys(scores).length === 0) return { ok: false, error: "Enter at least one score." };
  return { ok: true, scores };
}

// One judge's weighted total for one idea (0-10), or null until they have scored every
// criterion. Weights are percentages, so they are divided by their sum to stay fair even if
// they do not add up to exactly 100.
export function judgeTotal(criteria: Criterion[], scoresByCriterion: Map<string, number>): number | null {
  if (criteria.length === 0) return null;
  let weighted = 0;
  let weights = 0;
  for (const c of criteria) {
    const s = scoresByCriterion.get(c.id);
    if (s === undefined) return null;
    weighted += s * c.weight;
    weights += c.weight;
  }
  if (weights === 0) return null;
  return weighted / weights;
}

export type RankedIdea = {
  idea: JudgingIdea;
  rank: number | null; // null = nobody has fully scored it yet
  average: number | null; // average of the judges' totals, one decimal
  judgesScored: number;
};

// Ranks ideas by the average of the judges' weighted totals. Ideas nobody has fully scored
// go last (oldest first). Equal averages share a rank (1, 2, 2, 4).
export function rankIdeas(ideas: JudgingIdea[], criteria: Criterion[], scores: Score[]): RankedIdea[] {
  const byIdeaJudge = new Map<string, Map<string, Map<string, number>>>();
  for (const s of scores) {
    let judges = byIdeaJudge.get(s.idea_id);
    if (!judges) byIdeaJudge.set(s.idea_id, (judges = new Map()));
    let crit = judges.get(s.judge_id);
    if (!crit) judges.set(s.judge_id, (crit = new Map()));
    crit.set(s.criterion_id, s.score);
  }

  const rows = ideas.map((idea) => {
    const totals: number[] = [];
    for (const crit of byIdeaJudge.get(idea.id)?.values() ?? []) {
      const t = judgeTotal(criteria, crit);
      if (t !== null) totals.push(t);
    }
    const average = totals.length ? Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 10) / 10 : null;
    return { idea, average, judgesScored: totals.length };
  });

  const scored = rows
    .filter((r) => r.average !== null)
    .sort((a, b) => (b.average as number) - (a.average as number) || a.idea.created_at.localeCompare(b.idea.created_at));
  const unscored = rows
    .filter((r) => r.average === null)
    .sort((a, b) => a.idea.created_at.localeCompare(b.idea.created_at));

  const ranked: RankedIdea[] = [];
  scored.forEach((r, i) => {
    const prev = ranked[i - 1];
    const rank = prev && prev.average === r.average ? (prev.rank as number) : i + 1;
    ranked.push({ ...r, rank });
  });
  for (const r of unscored) ranked.push({ ...r, rank: null });
  return ranked;
}

// The current judge's own saved score for each criterion of one idea (for the form).
export function myScores(scores: Score[], ideaId: string, judgeId: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const s of scores) if (s.idea_id === ideaId && s.judge_id === judgeId) out.set(s.criterion_id, s.score);
  return out;
}

// Judge invites: lowercase, trimmed, validated.
export function parseJudgeEmail(raw: unknown): { ok: true; email: string } | { ok: false; error: string } {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!value) return { ok: false, error: "Enter the judge's email address." };
  if (value.length > 254) return { ok: false, error: "That email address is too long." };
  if (!z.email().safeParse(value).success) return { ok: false, error: "Enter a valid email address." };
  return { ok: true, email: value };
}
