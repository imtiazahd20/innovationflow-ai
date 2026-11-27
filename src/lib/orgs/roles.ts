// Organisations (workspaces) and the roles people hold in them. The list must match
// public.org_roles() in supabase/migrations/20261127000000_organizations.sql.

import { z } from "zod";

export const ORG_ROLES = ["admin", "organiser", "judge", "mentor", "participant", "project_owner"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const ROLE_LABELS: Record<OrgRole, string> = {
  admin: "Admin",
  organiser: "Organiser",
  judge: "Judge",
  mentor: "Mentor",
  participant: "Participant",
  project_owner: "Project owner",
};

// What each role can do today. Roles without screens yet say so honestly.
export const ROLE_HINTS: Record<OrgRole, string> = {
  admin: "Manages the workspace, its members and every challenge.",
  organiser: "Creates and runs the workspace's challenges.",
  judge: "Will score ideas across the workspace. For now, invite judges on each challenge.",
  mentor: "Will support teams. Mentoring arrives in a later phase.",
  participant: "Will register for events and submit ideas. Coming in a later phase.",
  project_owner: "Will run approved ideas as projects. Coming with the Impact Tracker.",
};

// Roles that can create and manage challenges.
export const MANAGER_ROLES: readonly OrgRole[] = ["admin", "organiser"];

export function isOrgRole(value: unknown): value is OrgRole {
  return typeof value === "string" && (ORG_ROLES as readonly string[]).includes(value);
}

export function canManageChallenges(roles: readonly OrgRole[]): boolean {
  return roles.some((r) => MANAGER_ROLES.includes(r));
}

export function isAdmin(roles: readonly OrgRole[]): boolean {
  return roles.includes("admin");
}

// Same limits as the database's CHECK rules.
export const ORG_NAME_MAX = 120;

export const orgNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name for the workspace.")
  .max(ORG_NAME_MAX, `The name can be at most ${ORG_NAME_MAX} characters.`);

export const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Enter an email address.")
    .max(254, "That email address is too long.")
    .pipe(z.email("Enter a valid email address, like name@example.com.")),
  role: z.enum(ORG_ROLES, "Choose a role."),
});

export type Membership = { user_id: string; email: string; role: OrgRole };

export type Member = { user_id: string; email: string; roles: OrgRole[] };

// One row per person with all their roles, in a stable order: admins first, then by email.
export function groupMembers(rows: readonly Membership[]): Member[] {
  const byUser = new Map<string, Member>();
  for (const row of rows) {
    if (!isOrgRole(row.role)) continue;
    const member = byUser.get(row.user_id) ?? { user_id: row.user_id, email: row.email, roles: [] };
    if (!member.roles.includes(row.role)) member.roles.push(row.role);
    if (!member.email && row.email) member.email = row.email;
    byUser.set(row.user_id, member);
  }
  const order = (r: OrgRole) => ORG_ROLES.indexOf(r);
  const members = [...byUser.values()].map((m) => ({ ...m, roles: [...m.roles].sort((a, b) => order(a) - order(b)) }));
  return members.sort(
    (a, b) => Number(isAdmin(b.roles)) - Number(isAdmin(a.roles)) || a.email.localeCompare(b.email),
  );
}

export type Workspace = { id: string; name: string; roles: OrgRole[] };

// Turns "my memberships, each with its organisation" into one entry per workspace.
export function groupWorkspaces(
  rows: readonly { organization_id: string; role: string; organizations: { name: string } | null }[],
): Workspace[] {
  const byOrg = new Map<string, Workspace>();
  for (const row of rows) {
    if (!isOrgRole(row.role) || !row.organizations) continue;
    const ws = byOrg.get(row.organization_id) ?? { id: row.organization_id, name: row.organizations.name, roles: [] };
    if (!ws.roles.includes(row.role)) ws.roles.push(row.role);
    byOrg.set(row.organization_id, ws);
  }
  return [...byOrg.values()].sort((a, b) => a.name.localeCompare(b.name));
}
