"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isChallengeId } from "@/lib/challenges/ids";
import { inviteSchema, isOrgRole, orgNameSchema } from "@/lib/orgs/roles";
import { NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

// Every action here re-checks the signed-in person; the database rules then decide whether
// they are an admin of this workspace. Nothing trusts the browser.

export type OrgFormState = { error?: string; done?: boolean; message?: string };

const GENERIC = "Something went wrong. Please try again in a moment.";
const isId = isChallengeId; // any UUID

async function session() {
  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_MESSAGE } as const;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, user: data.user } as const;
}

function refresh(orgId: string) {
  revalidatePath(`/dashboard/organizations/${orgId}`);
  revalidatePath("/dashboard");
}

export async function renameOrganization(orgId: string, _prev: OrgFormState, formData: FormData): Promise<OrgFormState> {
  if (!isId(orgId)) return { error: GENERIC };
  const parsed = orgNameSchema.safeParse(formData.get("name") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const s = await session();
  if ("error" in s) return { error: s.error };
  const { data, error } = await s.supabase.from("organizations").update({ name: parsed.data }).eq("id", orgId).select("id");
  if (error) {
    console.error("rename organization failed", error.code);
    return { error: GENERIC };
  }
  if (!data || data.length === 0) return { error: "Only admins can rename the workspace." };
  refresh(orgId);
  return { done: true, message: "Name saved." };
}

export async function inviteMember(orgId: string, _prev: OrgFormState, formData: FormData): Promise<OrgFormState> {
  if (!isId(orgId)) return { error: GENERIC };
  const parsed = inviteSchema.safeParse({ email: formData.get("email") ?? "", role: formData.get("role") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const s = await session();
  if ("error" in s) return { error: s.error };

  // Already a member with that role? Say so instead of creating an invitation that does nothing.
  const { data: existing } = await s.supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", orgId)
    .eq("email", parsed.data.email)
    .eq("role", parsed.data.role)
    .limit(1);
  if (existing && existing.length > 0) return { error: "That person already has this role." };

  const { error } = await s.supabase
    .from("organization_invites")
    .insert({ organization_id: orgId, email: parsed.data.email, role: parsed.data.role, invited_by: s.user.id });
  if (error) {
    if (error.code === "23505") return { error: "That person has already been invited with this role." };
    if (error.code === "42501") return { error: "Only admins can invite people." };
    console.error("invite member failed", error.code);
    return { error: GENERIC };
  }
  refresh(orgId);
  return {
    done: true,
    message: `Invitation saved. ${parsed.data.email} joins as soon as they sign in (or sign up) with that address.`,
  };
}

export async function cancelInvite(orgId: string, inviteId: string): Promise<void> {
  if (!isId(orgId) || !isId(inviteId)) return;
  const s = await session();
  if ("error" in s) return;
  const { error } = await s.supabase.from("organization_invites").delete().eq("id", inviteId).eq("organization_id", orgId);
  if (error) console.error("cancel invite failed", error.code);
  refresh(orgId);
}

export async function removeMemberRole(orgId: string, userId: string, role: string): Promise<OrgFormState> {
  if (!isId(orgId) || !isId(userId) || !isOrgRole(role)) return { error: GENERIC };
  const s = await session();
  if ("error" in s) return { error: s.error };

  const { data, error } = await s.supabase.rpc("remove_org_member", { p_org: orgId, p_user: userId, p_role: role });
  if (error) {
    console.error("remove member failed", error.code);
    return { error: GENERIC };
  }
  if (data === "last-admin") return { error: "A workspace needs at least one admin. Make someone else an admin first." };
  if (data === "forbidden") return { error: "Only admins can change members." };

  refresh(orgId);
  // Removing your own admin role: you may not be able to see this page any more.
  if (userId === s.user.id && role === "admin") redirect("/dashboard");
  return { done: true };
}
