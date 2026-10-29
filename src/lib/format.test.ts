import { describe, expect, it } from "vitest";
import { formatDate } from "./format";

describe("formatDate", () => {
  it("formats a database date for people", () => {
    expect(formatDate("2026-12-01")).toBe("1 Dec 2026");
    expect(formatDate("2027-01-31")).toBe("31 Jan 2027");
  });

  it("returns unexpected input unchanged instead of crashing", () => {
    expect(formatDate("soon")).toBe("soon");
    expect(formatDate("2026-13-01")).toBe("2026-13-01");
  });
});
