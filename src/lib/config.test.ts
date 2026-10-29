import { describe, expect, it } from "vitest";
import { APP_NAME, MODULES } from "./config";

describe("app config", () => {
  it("names the product", () => {
    expect(APP_NAME).toBe("InnovationFlow AI");
  });

  it("defines the three modules in build order", () => {
    expect(MODULES.map((m) => m.id)).toEqual([
      "sprint-planner",
      "ai-judge",
      "impact-tracker",
    ]);
  });

  it("only marks the Sprint Planner as in progress", () => {
    const inProgress = MODULES.filter((m) => m.status === "in-progress");
    expect(inProgress).toHaveLength(1);
    expect(inProgress[0].id).toBe("sprint-planner");
  });

  it("gives every module a unique id", () => {
    const ids = MODULES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
