import { describe, expect, it } from "vitest";
import { balanceWeights, buildPlanPrompt, normalizeAiPlan } from "./ai-draft";
import { DEFAULT_CRITERIA } from "./draft";
import { parsePlan } from "./schema";

const basics = {
  title: "Reduce food waste in staff canteens",
  business_problem: "We throw away about a third of canteen food every week.",
  objectives: "Halve food waste within a year without reducing choice.",
  target_participants: "Kitchen staff, facilities and anyone who eats in the canteens.",
  deadline: "2027-01-31",
};
const today = "2026-12-01";
const fmt = (iso: string) => `formatted ${iso}`;

const goodBrief =
  "THE PROBLEM\nWe throw away a third of our canteen food.\n\nWHAT WE WANT TO ACHIEVE\nHalve it within a year.";

describe("balanceWeights", () => {
  it("keeps weights that already add up to 100", () => {
    expect(balanceWeights([40, 30, 20, 10])).toEqual([40, 30, 20, 10]);
  });

  it("rescales weights that don't add up to 100, keeping their proportions", () => {
    const result = balanceWeights([1, 1, 1]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(100);
    expect(Math.max(...result) - Math.min(...result)).toBeLessThanOrEqual(1);
  });

  it("treats missing or negative weights as small but never zero", () => {
    const result = balanceWeights([Number.NaN, -5, 50]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(100);
    expect(result.every((w) => w >= 1)).toBe(true);
    expect(result[2]).toBeGreaterThan(result[0]);
  });
});

describe("buildPlanPrompt", () => {
  it("includes the challenge details and the allowed date range", () => {
    const prompt = buildPlanPrompt(basics, today, "31 Jan 2027");
    expect(prompt).toContain("Reduce food waste in staff canteens");
    expect(prompt).toContain("between 2026-12-01 and 2027-01-31");
    expect(prompt).toContain("31 Jan 2027");
  });

  it("uses the deadline as the start when the deadline has passed", () => {
    expect(buildPlanPrompt(basics, "2027-03-01", "x")).toContain("between 2027-01-31 and 2027-01-31");
  });

  it("shortens very long fields", () => {
    const prompt = buildPlanPrompt({ ...basics, business_problem: "a".repeat(10000) }, today, "x");
    expect(prompt.length).toBeLessThan(6000);
  });
});

describe("normalizeAiPlan", () => {
  it("accepts a good AI answer and always returns a plan our rules accept", () => {
    const { plan, fromTemplate } = normalizeAiPlan(
      {
        brief: goodBrief,
        criteria: [
          { name: "Waste reduction", description: "How much waste it cuts.", weight: 40 },
          { name: "Cost", description: "Cost to run.", weight: 35 },
          { name: "Ease", description: "How easy it is to roll out.", weight: 30 },
        ],
        phases: [
          { name: "Launch", description: "Kick-off.", starts_on: "2026-12-01", ends_on: "2026-12-05" },
          { name: "Ideas", description: "Submit ideas.", starts_on: "2026-12-06", ends_on: "2027-01-20" },
          { name: "Judging", description: "Score.", starts_on: "2027-01-21", ends_on: "2027-01-31" },
        ],
      },
      basics,
      today,
      fmt,
    );
    expect(fromTemplate).toEqual([]);
    expect(plan.criteria.reduce((sum, c) => sum + c.weight, 0)).toBe(100);
    expect(plan.criteria.map((c) => c.name)).toEqual(["Waste reduction", "Cost", "Ease"]);
    expect(parsePlan(plan).ok).toBe(true);
  });

  it("keeps dates between today and the deadline and fixes reversed phases", () => {
    const { plan } = normalizeAiPlan(
      {
        brief: goodBrief,
        criteria: [
          { name: "A", description: "", weight: 50 },
          { name: "B", description: "", weight: 50 },
        ],
        phases: [
          { name: "Late", description: "", starts_on: "2027-03-01", ends_on: "2027-04-01" },
          { name: "Early", description: "", starts_on: "2025-01-01", ends_on: "2026-12-10" },
          { name: "Backwards", description: "", starts_on: "2027-01-10", ends_on: "2027-01-05" },
          { name: "Bad date", description: "", starts_on: "2027-02-30", ends_on: "2027-03-01" },
        ],
      },
      basics,
      today,
      fmt,
    );
    expect(plan.phases.map((p) => p.name)).toEqual(["Early", "Backwards", "Late"]);
    for (const p of plan.phases) {
      expect(p.starts_on >= today && p.ends_on <= basics.deadline && p.ends_on >= p.starts_on).toBe(true);
    }
  });

  it("drops duplicate criteria and keeps at most seven", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ name: `C${i}`, description: "", weight: 10 }));
    const { plan } = normalizeAiPlan(
      { brief: goodBrief, criteria: [...many, { name: "c0", description: "", weight: 99 }], phases: [] },
      basics,
      today,
      fmt,
    );
    expect(plan.criteria).toHaveLength(7);
    expect(plan.criteria.reduce((sum, c) => sum + c.weight, 0)).toBe(100);
  });

  it("falls back to the templates for parts the AI got unusably wrong", () => {
    const { plan, fromTemplate } = normalizeAiPlan({ brief: "hi", criteria: "nope" }, basics, today, fmt);
    expect(fromTemplate).toEqual(["brief", "criteria", "phases"]);
    expect(plan.brief).toContain("THE PROBLEM");
    expect(plan.criteria.map((c) => c.name)).toEqual(DEFAULT_CRITERIA.map((c) => c.name));
    expect(parsePlan(plan).ok).toBe(true);
  });

  it("copes with an answer that isn't an object at all", () => {
    expect(normalizeAiPlan(null, basics, today, fmt).fromTemplate).toHaveLength(3);
    expect(normalizeAiPlan("text", basics, today, fmt).fromTemplate).toHaveLength(3);
  });
});
