import { describe, expect, it } from "vitest";
import { parsePlan, totalWeight } from "./schema";

const good = {
  brief: "A brief",
  criteria: [
    { name: "Impact", description: "", weight: 60 },
    { name: "Feasibility", description: "x", weight: 40 },
  ],
  phases: [{ name: "Launch", description: "", starts_on: "2026-11-01", ends_on: "2026-11-05" }],
};

describe("parsePlan", () => {
  it("accepts a valid plan", () => {
    expect(parsePlan(good).ok).toBe(true);
  });

  it("accepts an empty plan (brief only)", () => {
    expect(parsePlan({ brief: "", criteria: [], phases: [] }).ok).toBe(true);
  });

  it("rejects weights that don't add up to 100 and says the total", () => {
    const r = parsePlan({ ...good, criteria: [{ name: "A", description: "", weight: 50 }] });
    expect(r).toEqual({ ok: false, errors: ["Criteria weights must add up to 100 (they add up to 50 now)."] });
  });

  it("names the row that has a problem", () => {
    const r = parsePlan({ ...good, criteria: [{ name: "A", description: "", weight: 100 }, { name: " ", description: "", weight: 0 }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toContain("Criterion 2: Enter a name.");
  });

  it("rejects a non-number weight", () => {
    const r = parsePlan({ ...good, criteria: [{ name: "A", description: "", weight: null }] });
    expect(r.ok).toBe(false);
  });

  it("rejects a phase that ends before it starts", () => {
    const r = parsePlan({ ...good, phases: [{ name: "P", description: "", starts_on: "2026-11-05", ends_on: "2026-11-01" }] });
    expect(r).toEqual({ ok: false, errors: ["Timeline phase 1: The end date can't be before the start date."] });
  });

  it("rejects an impossible date", () => {
    const r = parsePlan({ ...good, phases: [{ name: "P", description: "", starts_on: "2026-02-31", ends_on: "2026-03-01" }] });
    expect(r.ok).toBe(false);
  });

  it("rejects too many criteria and garbage input", () => {
    const many = Array.from({ length: 11 }, () => ({ name: "A", description: "", weight: 0 }));
    expect(parsePlan({ ...good, criteria: many }).ok).toBe(false);
    expect(parsePlan("nope").ok).toBe(false);
    expect(parsePlan(null).ok).toBe(false);
  });
});

describe("totalWeight", () => {
  it("adds weights and ignores non-finite ones", () => {
    expect(totalWeight([{ weight: 20 }, { weight: NaN }, { weight: 30 }])).toBe(50);
  });
});
