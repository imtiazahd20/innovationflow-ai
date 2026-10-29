import { describe, expect, it } from "vitest";
import { parseChallengeForm, todayISO } from "./challenge";

const TODAY = "2026-10-30";

function form(values: Record<string, string>) {
  return { get: (name: string) => (name in values ? values[name] : null) };
}

const valid = {
  title: "Cut delivery delays",
  business_problem: "Late deliveries are costing us customers.",
  objectives: "Reduce delays by 20%",
  target_participants: "Operations staff",
  deadline: "2026-12-01",
};

describe("parseChallengeForm", () => {
  it("accepts a complete, valid challenge and trims whitespace", () => {
    const result = parseChallengeForm(form({ ...valid, title: "  Cut delivery delays  " }), TODAY);
    expect(result).toEqual({ ok: true, value: valid });
  });

  it("accepts a deadline of today", () => {
    expect(parseChallengeForm(form({ ...valid, deadline: TODAY }), TODAY).ok).toBe(true);
  });

  it("asks for every empty field", () => {
    const result = parseChallengeForm(form({}), TODAY);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(
        ["business_problem", "deadline", "objectives", "target_participants", "title"],
      );
      expect(result.errors.title).toMatch(/enter a title/i);
      expect(result.errors.deadline).toMatch(/pick a deadline/i);
    }
  });

  it("treats whitespace-only text as empty", () => {
    const result = parseChallengeForm(form({ ...valid, title: "     " }), TODAY);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.title).toMatch(/enter a title/i);
  });

  it("enforces minimum lengths", () => {
    const result = parseChallengeForm(
      form({ ...valid, title: "ab", business_problem: "too short" }),
      TODAY,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.title).toMatch(/at least 3/);
      expect(result.errors.business_problem).toMatch(/at least 10/);
    }
  });

  it("enforces maximum lengths", () => {
    const result = parseChallengeForm(form({ ...valid, title: "x".repeat(201) }), TODAY);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.title).toMatch(/at most 200/);
  });

  it("rejects past, impossible and badly formatted dates", () => {
    const past = parseChallengeForm(form({ ...valid, deadline: "2026-10-29" }), TODAY);
    expect(past.ok).toBe(false);
    if (!past.ok) expect(past.errors.deadline).toMatch(/in the past/i);

    for (const deadline of ["2026-02-30", "2026-13-01", "30/11/2026", "tomorrow"]) {
      const result = parseChallengeForm(form({ ...valid, deadline }), TODAY);
      expect(result.ok, deadline).toBe(false);
      if (!result.ok) expect(result.errors.deadline, deadline).toMatch(/valid date/i);
    }
  });

  it("ignores unknown fields, so a forged owner_id never reaches the database", () => {
    const result = parseChallengeForm(form({ ...valid, owner_id: "someone-else" }), TODAY);
    expect(result.ok).toBe(true);
    if (result.ok) expect(Object.keys(result.value)).not.toContain("owner_id");
  });
});

describe("todayISO", () => {
  it("formats a date as YYYY-MM-DD", () => {
    expect(todayISO(new Date("2026-10-30T23:59:59Z"))).toBe("2026-10-30");
  });
});
