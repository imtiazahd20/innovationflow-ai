import { describe, expect, it } from "vitest";
import { buildOverview, daysLeftLabel, daysUntil } from "./overview";

const challenges = [
  { id: "a", title: "Alpha", status: "published", deadline: "2026-11-30" },
  { id: "b", title: "Beta", status: "draft", deadline: "2026-12-05" },
  { id: "c", title: "Gamma", status: "published", deadline: "2026-11-20" },
  { id: "d", title: "Delta", status: "published", deadline: "2026-12-31" },
];

describe("daysUntil", () => {
  it("counts whole days, across months and years", () => {
    expect(daysUntil("2026-11-28", "2026-11-28")).toBe(0);
    expect(daysUntil("2026-12-01", "2026-11-28")).toBe(3);
    expect(daysUntil("2027-01-01", "2026-12-31")).toBe(1);
    expect(daysUntil("2026-11-27", "2026-11-28")).toBe(-1);
  });
});

describe("buildOverview", () => {
  it("counts challenges by status and ideas per challenge", () => {
    const o = buildOverview(challenges, ["a", "a", "c", "a", "d"], "2026-11-28");
    expect(o.total).toBe(4);
    expect(o.published).toBe(3);
    expect(o.drafts).toBe(1);
    expect(o.ideas).toBe(5);
    expect(o.ideasByChallenge.get("a")).toBe(3);
    expect(o.ideasByChallenge.get("b")).toBeUndefined();
  });

  it("ignores ideas for challenges the person can't see", () => {
    expect(buildOverview(challenges, ["zzz"], "2026-11-28").ideas).toBe(0);
  });

  it("picks the soonest deadline of a published challenge that hasn't passed", () => {
    // Gamma has passed, Beta is a draft, so Alpha (in 2 days) is next.
    expect(buildOverview(challenges, [], "2026-11-28").nextDeadline).toEqual({
      id: "a",
      title: "Alpha",
      deadline: "2026-11-30",
      daysLeft: 2,
    });
  });

  it("has no next deadline when every published deadline has passed", () => {
    expect(buildOverview(challenges, [], "2027-02-01").nextDeadline).toBeNull();
    expect(buildOverview([], [], "2026-11-28")).toMatchObject({ total: 0, ideas: 0, nextDeadline: null });
  });
});

describe("daysLeftLabel", () => {
  it("reads naturally", () => {
    expect(daysLeftLabel(0)).toBe("today");
    expect(daysLeftLabel(1)).toBe("tomorrow");
    expect(daysLeftLabel(12)).toBe("in 12 days");
  });
});
