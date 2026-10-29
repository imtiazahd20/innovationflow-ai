// The rules for a challenge, written once with Zod and used by both the form (to show
// messages) and the server (to refuse bad data). The limits match the database's CHECK
// rules in supabase/migrations, so the database never has to say no first.

import { z } from "zod";

export const LIMITS = {
  title: { min: 3, max: 200 },
  businessProblem: { min: 10, max: 5000 },
  objectives: { min: 3, max: 5000 },
  targetParticipants: { min: 3, max: 1000 },
} as const;

// Today's date as YYYY-MM-DD in UTC. Passed in so tests can pin it.
export function todayISO(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function text(label: string, min: number, max: number) {
  return z
    .string()
    .trim()
    .min(1, `Enter ${label}.`)
    .min(min, `${capitalise(label)} needs at least ${min} characters.`)
    .max(max, `${capitalise(label)} can be at most ${max} characters.`);
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function challengeSchema(today: string = todayISO()) {
  return z.object({
    title: text("a title", LIMITS.title.min, LIMITS.title.max),
    business_problem: text(
      "the business problem",
      LIMITS.businessProblem.min,
      LIMITS.businessProblem.max,
    ),
    objectives: text("the objectives", LIMITS.objectives.min, LIMITS.objectives.max),
    target_participants: text(
      "who the participants are",
      LIMITS.targetParticipants.min,
      LIMITS.targetParticipants.max,
    ),
    deadline: z
      .string()
      .trim()
      .min(1, "Pick a deadline.")
      .refine(isRealDate, "Enter a valid date.")
      .refine((value) => !isRealDate(value) || value >= today, "The deadline can't be in the past."),
  });
}

export type ChallengeInput = z.infer<ReturnType<typeof challengeSchema>>;
export type ChallengeField = keyof ChallengeInput;
export type ChallengeFieldErrors = Partial<Record<ChallengeField, string>>;

export type ChallengeResult =
  | { ok: true; value: ChallengeInput }
  | { ok: false; errors: ChallengeFieldErrors };

const FIELDS: ChallengeField[] = [
  "title",
  "business_problem",
  "objectives",
  "target_participants",
  "deadline",
];

// Reads the five fields out of a submitted form and checks them.
export function parseChallengeForm(
  form: { get(name: string): unknown },
  today: string = todayISO(),
): ChallengeResult {
  const raw: Record<string, unknown> = {};
  for (const field of FIELDS) {
    const value = form.get(field);
    raw[field] = typeof value === "string" ? value : "";
  }

  const parsed = challengeSchema(today).safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };

  // Keep only the first message for each field.
  const errors: ChallengeFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as ChallengeField | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { ok: false, errors };
}
