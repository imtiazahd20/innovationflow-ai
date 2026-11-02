import { describe, expect, it } from "vitest";
import { parsePublicChallenge, publishBlocker, sharePath } from "./public";

const good = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "T",
  business_problem: "p",
  objectives: "o",
  target_participants: "t",
  deadline: "2026-12-01",
  brief: null,
  criteria: [{ name: "Impact", description: null, weight: 100 }],
  phases: [{ name: "Build", description: null, starts_on: "2026-11-01", ends_on: "2026-11-05" }],
};

describe("parsePublicChallenge", () => {
  it("accepts the expected shape", () => {
    expect(parsePublicChallenge(good)?.title).toBe("T");
  });
  it("rejects null, junk and missing fields", () => {
    expect(parsePublicChallenge(null)).toBeNull();
    expect(parsePublicChallenge("x")).toBeNull();
    expect(parsePublicChallenge({ ...good, criteria: undefined })).toBeNull();
  });
});

describe("publishBlocker", () => {
  it("requires a non-blank brief", () => {
    expect(publishBlocker(null)).toMatch(/brief/i);
    expect(publishBlocker("   ")).toMatch(/brief/i);
    expect(publishBlocker("Hello")).toBeNull();
  });
});

it("builds the share path", () => {
  expect(sharePath("abc")).toBe("/c/abc");
});
