import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isChallengeId } from "@/lib/challenges/ids";
import { APP_NAME } from "@/lib/config";
import { ORG_ROLES, ROLE_HINTS, ROLE_LABELS, canManageChallenges, groupMembers, isAdmin, isOrgRole, type Membership, type OrgRole } from "@/lib/orgs/roles";
import { createClient } from "@/lib/supabase/server";
import { safeAppLink, timeAgo } from "@/lib/time";
import { cancelInvite, inviteMember, removeMemberRole, renameOrganization } from "./actions";
import { InviteForm, MemberList, PendingInvites, RenameForm } from "./org-panels";

export const metadata = { title: `Workspace · ${APP_NAME}` };

export default function OrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12">
      <Link href="/dashboard" className="text-sm font-medium text-flow-blue hover:underline">
        ← Your challenges
      </Link>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl border-2 border-flow-ink bg-flow-yellow" aria-hidden />}>
        <OrganizationContent params={params} />
      </Suspense>
    </main>
  );
}

async function OrganizationContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isChallengeId(id)) notFound();

  const supabase = await createClient();
  if (!supabase) {
    return <p className="rounded-xl border-2 border-flow-ink bg-flow-yellow p-5 text-flow-ink">The database isn&apos;t connected yet.</p>;
  }
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");
  const meId = userData.user.id;

  // The database only returns this workspace if the signed-in person is a member.
  const { data: org } = await supabase.from("organizations").select("id, name").eq("id", id).maybeSingle();
  if (!org) notFound();

  const { data: memberRows, error: membersError } = await supabase
    .from("organization_members")
    .select("user_id, email, role")
    .eq("organization_id", id);
  if (membersError) console.error("load members failed", membersError.code);
  const members = groupMembers((memberRows ?? []) as Membership[]);
  const myRoles = members.find((m) => m.user_id === meId)?.roles ?? [];
  const admin = isAdmin(myRoles);

  let invites: { id: string; email: string; role: OrgRole }[] = [];
  if (admin) {
    const { data: inviteRows } = await supabase
      .from("organization_invites")
      .select("id, email, role")
      .eq("organization_id", id)
      .order("created_at", { ascending: true });
    invites = (inviteRows ?? []).filter((r): r is { id: string; email: string; role: OrgRole } => isOrgRole(r.role));
  }

  // Admins and organisers see the workspace's history (the database enforces this too).
  const canSeeActivity = canManageChallenges(myRoles);
  let activity: { id: number; actor_label: string; summary: string; link: string | null; created_at: string }[] = [];
  if (canSeeActivity) {
    const { data: activityRows, error: activityError } = await supabase
      .from("activity_logs")
      .select("id, actor_label, summary, link, created_at")
      .eq("organization_id", id)
      .order("created_at", { ascending: false })
      .limit(25);
    if (activityError) console.error("load activity failed", activityError.code);
    activity = activityRows ?? [];
  }

  return (
    <>
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-flow-red">Workspace</p>
        <h1 className="font-display text-3xl font-black uppercase tracking-tight text-flow-ink break-words">{org.name}</h1>
        <p className="text-sm text-zinc-800">
          Your {myRoles.length === 1 ? "role" : "roles"}: {myRoles.map((r) => ROLE_LABELS[r]).join(", ") || "none"}
        </p>
      </header>

      {admin ? (
        <section aria-label="Workspace settings" className="flex flex-col gap-4 rounded-2xl border-4 border-flow-ink bg-white p-5 shadow-[4px_4px_0_0_#0d0d0d]">
          <RenameForm name={org.name} action={renameOrganization.bind(null, id)} />
        </section>
      ) : null}

      <MemberList members={members} meId={meId} canEdit={admin} removeAction={removeMemberRole.bind(null, id)} />

      {admin ? (
        <div className="grid gap-8 md:grid-cols-2">
          <InviteForm action={inviteMember.bind(null, id)} />
          <PendingInvites invites={invites} cancelAction={cancelInvite.bind(null, id)} />
        </div>
      ) : (
        <p className="rounded-xl border-2 border-dashed border-flow-ink p-4 text-sm text-zinc-800">
          Only admins can invite people or change roles.
        </p>
      )}

      {canSeeActivity ? (
        <section aria-labelledby="activity-heading" className="flex flex-col gap-4 rounded-2xl border-4 border-flow-ink bg-white p-5 shadow-[4px_4px_0_0_#0d0d0d]">
          <h2 id="activity-heading" className="font-display text-xl font-black uppercase text-flow-ink">Recent activity</h2>
          {activity.length === 0 ? (
            <p className="text-sm text-zinc-800">
              Nothing recorded yet. New challenges, ideas, invitations and role changes will appear here.
            </p>
          ) : (
            <ol className="flex flex-col divide-y-2 divide-flow-ink/10">
              {activity.map((a) => {
                const href = safeAppLink(a.link);
                return (
                  <li key={a.id} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                    <p className="min-w-0 text-sm text-flow-ink">
                      <span className="font-semibold">{a.actor_label}</span>{" "}
                      {href ? (
                        <Link href={href} className="hover:underline">{a.summary}</Link>
                      ) : (
                        a.summary
                      )}
                    </p>
                    <time dateTime={a.created_at} className="shrink-0 text-xs text-zinc-700">{timeAgo(a.created_at)}</time>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      ) : null}

      <section aria-labelledby="roles-heading" className="flex flex-col gap-3">
        <h2 id="roles-heading" className="font-display text-lg font-black uppercase text-flow-ink">What each role can do</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          {ORG_ROLES.map((r) => (
            <div key={r} className="rounded-xl border-2 border-flow-ink bg-white p-3">
              <dt className="text-sm font-black uppercase text-flow-ink">{ROLE_LABELS[r]}</dt>
              <dd className="mt-1 text-sm text-zinc-800">{ROLE_HINTS[r]}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
