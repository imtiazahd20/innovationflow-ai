import { NextResponse, type NextRequest } from "next/server";
import { prepareWorkspaces } from "@/lib/orgs/server";
import { createClient } from "@/lib/supabase/server";

// "Members & roles" in the navigation: opens the signed-in person's workspace. People in
// several workspaces land on the first (by name) and can switch from the dashboard.
export async function GET(request: NextRequest) {
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));

  const supabase = await createClient();
  if (!supabase) return to("/dashboard");
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return to("/login");

  const workspaces = await prepareWorkspaces(supabase, data.user.id);
  const first = workspaces?.[0];
  return to(first ? `/dashboard/organizations/${first.id}` : "/dashboard");
}
