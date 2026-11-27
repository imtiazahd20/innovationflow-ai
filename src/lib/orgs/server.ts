// Server-only helpers for workspaces. Every query runs as the signed-in person, so the
// database's security rules decide what comes back.

import type { createClient } from "@/lib/supabase/server";
import { groupWorkspaces, type Workspace } from "./roles";

type Supabase = NonNullable<Awaited<ReturnType<typeof createClient>>>;

async function myWorkspaces(supabase: Supabase, userId: string): Promise<Workspace[] | null> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(name)")
    .eq("user_id", userId);
  if (error) {
    console.error("load workspaces failed", error.code);
    return null;
  }
  return groupWorkspaces((data ?? []) as unknown as Parameters<typeof groupWorkspaces>[0]);
}

// Run when someone opens their dashboard: claim any invitations sent to their email, and give
// a brand-new person their own workspace. Returns null if the workspaces couldn't be loaded.
export async function prepareWorkspaces(supabase: Supabase, userId: string): Promise<Workspace[] | null> {
  const { error: inviteError } = await supabase.rpc("accept_org_invites");
  if (inviteError) console.error("accept invites failed", inviteError.code);

  let workspaces = await myWorkspaces(supabase, userId);
  if (workspaces && workspaces.length === 0) {
    const { error } = await supabase.rpc("ensure_workspace");
    if (error) {
      console.error("create workspace failed", error.code);
      return null;
    }
    workspaces = await myWorkspaces(supabase, userId);
  }
  return workspaces;
}

export { myWorkspaces };
