import { describe, expect, it } from "vitest";
import { safeAppLink, timeAgo } from "./time";

const now = new Date("2026-11-28T12:00:00Z");

describe("timeAgo", () => {
  it("reads naturally for recent times", () => {
    expect(timeAgo("2026-11-28T11:59:30Z", now)).toBe("just now");
    expect(timeAgo("2026-11-28T11:59:00Z", now)).toBe("1 minute ago");
    expect(timeAgo("2026-11-28T11:15:00Z", now)).toBe("45 minutes ago");
    expect(timeAgo("2026-11-28T09:00:00Z", now)).toBe("3 hours ago");
    expect(timeAgo("2026-11-27T10:00:00Z", now)).toBe("yesterday");
    expect(timeAgo("2026-11-24T12:00:00Z", now)).toBe("4 days ago");
  });

  it("shows a date for anything older than a week", () => {
    expect(timeAgo("2026-11-03T12:00:00Z", now)).toBe("3 Nov 2026");
  });

  it("copes with bad input", () => {
    expect(timeAgo("not a date", now)).toBe("");
  });
});

describe("safeAppLink", () => {
  it("keeps links inside the app", () => {
    expect(safeAppLink("/dashboard/challenges/abc")).toBe("/dashboard/challenges/abc");
  });

  it("drops anything that could leave the app", () => {
    expect(safeAppLink("https://evil.example")).toBeNull();
    expect(safeAppLink("//evil.example")).toBeNull();
    expect(safeAppLink("/\\evil.example")).toBeNull();
    expect(safeAppLink(null)).toBeNull();
  });
});
