import { describe, expect, it } from "vitest";
import { isChallengeId } from "./ids";

describe("isChallengeId", () => {
  it("accepts a UUID", () => {
    expect(isChallengeId("3f2504e0-4f89-41d3-9a0c-0305e82c3301")).toBe(true);
  });

  it("rejects anything else", () => {
    for (const value of ["abc", "", "123", "3f2504e0-4f89-41d3-9a0c-0305e82c330", undefined, null, 42, "'; drop table challenges;--"]) {
      expect(isChallengeId(value), String(value)).toBe(false);
    }
  });
});
