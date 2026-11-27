import { describe, expect, it } from "vitest";
import { CHANGELOG, ROADMAP, STATUS_LABELS, deferredItems, overallProgress, phaseProgress } from "./roadmap";

const allItems = ROADMAP.flatMap((p) => p.items);

describe("roadmap data", () => {
  it("numbers the phases 1, 2, 3… in order, each with at least one item", () => {
    expect(ROADMAP.map((p) => p.number)).toEqual(ROADMAP.map((_, i) => i + 1));
    for (const phase of ROADMAP) expect(phase.items.length).toBeGreaterThan(0);
  });

  it("gives every phase and item a unique id", () => {
    const ids = [...ROADMAP.map((p) => p.id), ...allItems.map((i) => i.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses only known statuses", () => {
    for (const item of allItems) expect(Object.keys(STATUS_LABELS)).toContain(item.status);
  });

  it("says what every deferred item is waiting to pay for, and only deferred items", () => {
    for (const item of allItems) {
      if (item.status === "deferred") expect(item.costNote?.trim()).toBeTruthy();
      else expect(item.costNote).toBeUndefined();
    }
  });

  it("lists the changelog newest first with real dates", () => {
    const dates = CHANGELOG.map((e) => e.date);
    for (const d of dates) expect(new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10)).toBe(d);
    expect([...dates].sort().reverse()).toEqual(dates);
  });
});

describe("progress", () => {
  it("counts done items and leaves deferred ones out", () => {
    expect(
      phaseProgress([
        { id: "a", title: "a", status: "done" },
        { id: "b", title: "b", status: "planned" },
        { id: "c", title: "c", status: "deferred", costNote: "x" },
      ]),
    ).toEqual({ done: 1, total: 2, percent: 50 });
  });

  it("reports 0% for an empty or all-deferred list", () => {
    expect(phaseProgress([]).percent).toBe(0);
    expect(phaseProgress([{ id: "a", title: "a", status: "deferred", costNote: "x" }])).toEqual({
      done: 0,
      total: 0,
      percent: 0,
    });
  });

  it("adds up every phase for the overall figure", () => {
    const overall = overallProgress();
    expect(overall.total).toBe(allItems.filter((i) => i.status !== "deferred").length);
    expect(overall.done).toBe(allItems.filter((i) => i.status === "done").length);
  });

  it("lists deferred items with the phase they belong to", () => {
    const list = deferredItems();
    expect(list.length).toBe(allItems.filter((i) => i.status === "deferred").length);
    expect(list.every((i) => i.phase.length > 0)).toBe(true);
  });
});
