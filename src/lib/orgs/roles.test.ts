import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ORG_ROLES,
  ROLE_HINTS,
  ROLE_LABELS,
  canManageChallenges,
  groupMembers,
  groupWorkspaces,
  inviteSchema,
  isAdmin,
  isOrgRole,
  orgNameSchema,
} from "./roles";

describe("roles", () => {
  it("matches the roles the database accepts", () => {
    const sql = readFileSync("supabase/migrations/20261127000000_organizations.sql", "utf8");
    const match = /select array\[([^\]]+)\]/.exec(sql);
    const dbRoles = match?.[1].split(",").map((s) => s.trim().replace(/'/g, ""));
    expect(dbRoles).toEqual([...ORG_ROLES]);
  });

  it("has a label and an explanation for every role", () => {
    for (const role of ORG_ROLES) {
      expect(ROLE_LABELS[role]).toBeTruthy();
      expect(ROLE_HINTS[role]).toBeTruthy();
    }
  });

  it("lets only admins and organisers manage challenges", () => {
    expect(canManageChallenges(["admin"])).toBe(true);
    expect(canManageChallenges(["organiser"])).toBe(true);
    expect(canManageChallenges(["judge", "mentor", "participant", "project_owner"])).toBe(false);
    expect(isAdmin(["organiser"])).toBe(false);
  });

  it("recognises only known roles", () => {
    expect(isOrgRole("mentor")).toBe(true);
    expect(isOrgRole("owner")).toBe(false);
    expect(isOrgRole(undefined)).toBe(false);
  });
});

describe("inviteSchema", () => {
  it("cleans up the email address", () => {
    expect(inviteSchema.parse({ email: "  Ana@Example.COM ", role: "organiser" })).toEqual({
      email: "ana@example.com",
      role: "organiser",
    });
  });

  it("explains bad input", () => {
    const empty = inviteSchema.safeParse({ email: "", role: "admin" });
    expect(empty.success).toBe(false);
    expect(empty.error?.issues[0].message).toBe("Enter an email address.");

    const bad = inviteSchema.safeParse({ email: "not-an-email", role: "admin" });
    expect(bad.error?.issues[0].message).toMatch(/valid email/);

    const role = inviteSchema.safeParse({ email: "a@b.co", role: "owner" });
    expect(role.error?.issues[0].message).toBe("Choose a role.");
  });
});

describe("orgNameSchema", () => {
  it("trims and limits the name", () => {
    expect(orgNameSchema.parse("  Acme Innovation  ")).toBe("Acme Innovation");
    expect(orgNameSchema.safeParse("   ").success).toBe(false);
    expect(orgNameSchema.safeParse("x".repeat(121)).success).toBe(false);
  });
});

describe("groupMembers", () => {
  it("puts each person once with all their roles, admins first", () => {
    const members = groupMembers([
      { user_id: "u2", email: "zoe@example.com", role: "mentor" },
      { user_id: "u1", email: "bob@example.com", role: "judge" },
      { user_id: "u2", email: "zoe@example.com", role: "admin" },
      { user_id: "u1", email: "bob@example.com", role: "organiser" },
      { user_id: "u3", email: "amy@example.com", role: "participant" },
    ]);
    expect(members).toEqual([
      { user_id: "u2", email: "zoe@example.com", roles: ["admin", "mentor"] },
      { user_id: "u3", email: "amy@example.com", roles: ["participant"] },
      { user_id: "u1", email: "bob@example.com", roles: ["organiser", "judge"] },
    ]);
  });

  it("ignores unknown roles", () => {
    expect(groupMembers([{ user_id: "u", email: "e", role: "owner" as never }])).toEqual([]);
  });
});

describe("groupWorkspaces", () => {
  it("merges roles per workspace and sorts by name", () => {
    expect(
      groupWorkspaces([
        { organization_id: "o2", role: "judge", organizations: { name: "Beta" } },
        { organization_id: "o1", role: "admin", organizations: { name: "Alpha" } },
        { organization_id: "o2", role: "organiser", organizations: { name: "Beta" } },
        { organization_id: "o3", role: "admin", organizations: null },
      ]),
    ).toEqual([
      { id: "o1", name: "Alpha", roles: ["admin"] },
      { id: "o2", name: "Beta", roles: ["judge", "organiser"] },
    ]);
  });
});
