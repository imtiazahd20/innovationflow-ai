// The rules for a challenge's plan (brief + judging criteria + timeline), written once with
// Zod. The server uses them to refuse bad data; the limits match the database CHECK rules.

import { z } from "zod";

export const PLAN_LIMITS = {
  brief: 20000,
  name: 200,
  description: 2000,
  maxCriteria: 10,
  maxPhases: 12,
} as const;

export type CriterionInput = { name: string; description: string; weight: number };
export type PhaseInput = { name: string; description: string; starts_on: string; ends_on: string };
export type PlanInput = { brief: string; criteria: CriterionInput[]; phases: PhaseInput[] };

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const name = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(PLAN_LIMITS.name, `The name can be at most ${PLAN_LIMITS.name} characters.`);

const description = z
  .string()
  .trim()
  .max(PLAN_LIMITS.description, `The description can be at most ${PLAN_LIMITS.description} characters.`);

const criterion = z.object({
  name,
  description,
  weight: z
    .number("Enter a weight as a number.")
    .int("The weight must be a whole number.")
    .min(0, "The weight can't be below 0.")
    .max(100, "The weight can't be above 100."),
});

const date = z.string().trim().refine(isRealDate, "Pick a valid date.");

const phase = z
  .object({ name, description, starts_on: date, ends_on: date })
  .refine((p) => !isRealDate(p.starts_on) || !isRealDate(p.ends_on) || p.ends_on >= p.starts_on, {
    message: "The end date can't be before the start date.",
    path: ["ends_on"],
  });

const planSchema = z.object({
  brief: z.string().trim().max(PLAN_LIMITS.brief, `The brief can be at most ${PLAN_LIMITS.brief} characters.`),
  criteria: z
    .array(criterion)
    .max(PLAN_LIMITS.maxCriteria, `Use at most ${PLAN_LIMITS.maxCriteria} criteria.`)
    .refine(
      (list) => list.length === 0 || list.reduce((sum, c) => sum + c.weight, 0) === 100,
      { message: "WEIGHTS" },
    ),
  phases: z.array(phase).max(PLAN_LIMITS.maxPhases, `Use at most ${PLAN_LIMITS.maxPhases} timeline phases.`),
});

export type PlanResult = { ok: true; value: PlanInput } | { ok: false; errors: string[] };

export function totalWeight(criteria: { weight: number }[]): number {
  return criteria.reduce((sum, c) => sum + (Number.isFinite(c.weight) ? c.weight : 0), 0);
}

// Checks a plan (usually parsed from JSON sent by the editor) and returns readable messages
// like "Criterion 2: Enter a name." instead of raw Zod output.
export function parsePlan(raw: unknown): PlanResult {
  const parsed = planSchema.safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };

  const errors: string[] = [];
  const add = (message: string) => {
    if (!errors.includes(message)) errors.push(message);
  };
  for (const issue of parsed.error.issues) {
    const [section, index] = issue.path;
    if (section === "criteria" && typeof index === "number") {
      add(`Criterion ${index + 1}: ${issue.message}`);
    } else if (section === "phases" && typeof index === "number") {
      add(`Timeline phase ${index + 1}: ${issue.message}`);
    } else if (section === "criteria" && issue.message === "WEIGHTS") {
      const total = totalWeight((raw as { criteria?: { weight: number }[] })?.criteria ?? []);
      add(`Criteria weights must add up to 100 (they add up to ${total} now).`);
    } else {
      add(issue.message === "WEIGHTS" ? "Criteria weights must add up to 100." : issue.message);
    }
  }
  return { ok: false, errors };
}
