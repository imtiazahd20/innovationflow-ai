import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { APP_NAV, isActive } from "./nav";
import { ROADMAP } from "./roadmap";

const items = APP_NAV.flatMap((g) => g.items);

// Where a path lives in the code: a page.tsx or a route.ts in the matching app folder.
function routeExists(path: string): boolean {
  const dir = `src/app${path === "/" ? "" : path}`;
  return existsSync(`${dir}/page.tsx`) || existsSync(`${dir}/route.ts`);
}

describe("app navigation", () => {
  it("links every live item to a page that exists", () => {
    for (const item of items.filter((i) => !i.soon)) {
      expect(routeExists(item.href.split("#")[0]), item.href).toBe(true);
    }
  });

  it("sends every 'soon' item to a real section of the roadmap", () => {
    const phaseIds = ROADMAP.map((p) => p.id);
    for (const item of items.filter((i) => i.soon)) {
      const [path, anchor] = item.href.split("#");
      expect(path).toBe("/roadmap");
      expect(phaseIds).toContain(anchor);
    }
  });
});

describe("isActive", () => {
  const dashboard = items.find((i) => i.label === "Dashboard")!;
  const members = items.find((i) => i.label === "Members & roles")!;
  const roadmap = items.find((i) => i.label === "Roadmap")!;

  it("highlights the dashboard on the list and on challenge pages", () => {
    expect(isActive(dashboard, "/dashboard")).toBe(true);
    expect(isActive(dashboard, "/dashboard/challenges/abc/judging")).toBe(true);
    expect(isActive(dashboard, "/dashboard/organizations/abc")).toBe(false);
  });

  it("highlights members on workspace pages", () => {
    expect(isActive(members, "/dashboard/organizations/abc")).toBe(true);
    expect(isActive(members, "/dashboard")).toBe(false);
  });

  it("doesn't match look-alike paths", () => {
    expect(isActive(roadmap, "/roadmap")).toBe(true);
    expect(isActive(roadmap, "/roadmapper")).toBe(false);
  });
});
