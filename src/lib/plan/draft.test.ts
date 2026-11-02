import { describe, expect, it } from "vitest";
import { DEFAULT_CRITERIA, draftPhases, draftPlan } from "./draft";
import { parsePlan } from "./schema";

const basics = {
  title: "Cut delivery delays",
  business_problem: "Late deliveries are costing us customers.",
  objectives: "Reduce delays by 20%",
  target_participants: "Operations staff",
  deadline: "2026-12-01",
};
const fmt = (iso: string) => `D(${iso})`;

describe("draftPhases", () => {
  it("spreads five phases from today to the deadline, in order", () => {
    const phases = draftPhases("2026-12-01", "2026-11-01");
    expect(phases).toHaveLength(5);
    expect(phases[0].starts_on).toBe("2026-11-01");
    expect(phases[4].ends_on).toBe("2026-12-01");
    for (let i = 0; i < phases.length; i++) {
      expect(phases[i].ends_on >= phases[i].starts_on).toBe(true);
      if (i > 0) expect(phases[i].starts_on >= phases[i - 1].starts_on).toBe(true);
    }
  });

  it("copes with a deadline today or in the past", () => {
    for (const deadline of ["2026-11-01", "2026-10-01"]) {
      const phases = draftPhases(deadline, "2026-11-01");
      expect(phases.every((p) => p.starts_on === deadline && p.ends_on === deadline)).toBe(true);
    }
  });

  it("copes with a very short window", () => {
    const phases = draftPhases("2026-11-03", "2026-11-01");
    expect(phases.every((p) => p.ends_on >= p.starts_on)).toBe(true);
  });
});

describe("draftPlan", () => {
  it("default criteria add up to 100", () => {
    expect(DEFAULT_CRITERIA.reduce((s, c) => s + c.weight, 0)).toBe(100);
  });

  it("produces a plan that passes validation and uses the challenge text", () => {
    const plan = draftPlan(basics, "2026-11-01", fmt);
    expect(plan.brief.startsWith("Cut delivery delays")).toBe(true);
    expect(plan.brief).toContain("THE PROBLEM");
    expect(plan.brief).toContain("Late deliveries are costing us customers.");
    expect(plan.brief).toContain("D(2026-12-01)");
    expect(parsePlan(plan).ok).toBe(true);
  });

  it("returns fresh copies so editing a draft can't change the defaults", () => {
    const a = draftPlan(basics, "2026-11-01", fmt);
    a.criteria[0].weight = 1;
    expect(DEFAULT_CRITERIA[0].weight).toBe(25);
  });
});
