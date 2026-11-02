// Builds a FIRST DRAFT of the plan from what the person typed, using fixed templates.
// No AI and no cost: it just rearranges the challenge text and spreads phases between
// today and the deadline. The person edits the result before saving.

import type { CriterionInput, PhaseInput, PlanInput } from "./schema";

export type ChallengeBasics = {
  title: string;
  business_problem: string;
  objectives: string;
  target_participants: string;
  deadline: string;
};

const DAY = 24 * 60 * 60 * 1000;

function toTime(value: string): number {
  return new Date(`${value}T00:00:00Z`).getTime();
}

function addDays(value: string, days: number): string {
  return new Date(toTime(value) + days * DAY).toISOString().slice(0, 10);
}

export const DEFAULT_CRITERIA: CriterionInput[] = [
  { name: "Impact", description: "How much the idea would improve the problem described in the challenge.", weight: 25 },
  { name: "Feasibility", description: "Whether the idea can realistically be built and run with the time and resources available.", weight: 20 },
  { name: "Creativity", description: "How fresh and original the approach is.", weight: 15 },
  { name: "Business value", description: "The likely benefit to the organisation compared with the cost and effort.", weight: 15 },
  { name: "Scalability", description: "Whether the idea can grow beyond a first pilot to more teams, customers or markets.", weight: 15 },
  { name: "Clarity of pitch", description: "How clearly the team explains the problem, the idea and the next steps.", weight: 10 },
];

// Each phase takes a share of the time between the start and the deadline.
const PHASE_PLAN = [
  { name: "Launch and kick-off", from: 0, to: 0.1, description: "Announce the challenge, share the brief and answer questions." },
  { name: "Ideas and submissions", from: 0.1, to: 0.6, description: "Participants develop ideas and submit their proposals." },
  { name: "Review and shortlist", from: 0.6, to: 0.8, description: "Judges score the proposals and choose the shortlist." },
  { name: "Final pitches", from: 0.8, to: 0.95, description: "Shortlisted teams present to the judges." },
  { name: "Winners announced", from: 0.95, to: 1, description: "Results are shared and next steps are agreed." },
] as const;

export function draftPhases(deadline: string, today: string): PhaseInput[] {
  // A deadline in the past can't be spread over time, so everything lands on the deadline.
  const start = today < deadline ? today : deadline;
  const span = Math.round((toTime(deadline) - toTime(start)) / DAY);
  return PHASE_PLAN.map((p) => {
    const starts_on = addDays(start, Math.floor(span * p.from));
    const ends_on = addDays(start, Math.floor(span * p.to));
    return {
      name: p.name,
      description: p.description,
      starts_on,
      ends_on: ends_on < starts_on ? starts_on : ends_on,
    };
  });
}

export function draftBrief(c: ChallengeBasics, formatDeadline: (iso: string) => string): string {
  return [
    c.title,
    "",
    "THE PROBLEM",
    c.business_problem,
    "",
    "WHAT WE WANT TO ACHIEVE",
    c.objectives,
    "",
    "WHO SHOULD TAKE PART",
    c.target_participants,
    "",
    "WHAT TO SUBMIT",
    "A short proposal that explains your idea, why it solves the problem above, and how it could be put into practice.",
    "",
    "DEADLINE",
    `Submissions close on ${formatDeadline(c.deadline)}.`,
  ].join("\n");
}

export function draftPlan(
  c: ChallengeBasics,
  today: string,
  formatDeadline: (iso: string) => string,
): PlanInput {
  return {
    brief: draftBrief(c, formatDeadline),
    criteria: DEFAULT_CRITERIA.map((x) => ({ ...x })),
    phases: draftPhases(c.deadline, today),
  };
}
