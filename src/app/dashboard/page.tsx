import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { buildOverview, daysLeftLabel, type Overview } from "@/lib/dashboard/overview";
import { formatDate } from "@/lib/format";
import { ROLE_LABELS, canManageChallenges, type Workspace } from "@/lib/orgs/roles";
import { prepareWorkspaces } from "@/lib/orgs/server";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/validation/challenge";

export const metadata = { title: `Dashboard · ${APP_NAME}` };

// The page frame loads instantly. The part that checks who is logged in streams in behind
// <Suspense>, because reading the login cookie can only happen when a request arrives.
export default function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string }>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-12">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl border-2 border-flow-ink bg-flow-yellow" aria-hidden />}>
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function DashboardContent({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string }>;
}) {
  const supabase = await createClient();

  if (!supabase) {
    return (
      <section className="rounded-xl border-2 border-flow-ink bg-flow-yellow p-6">
        <h1 className="font-display text-xl font-black uppercase text-flow-ink">Database not connected yet</h1>
        <p className="mt-2 text-flow-ink">
          The dashboard needs the Supabase connection settings. Once they are added, sign in
          again and your challenges will appear here.
        </p>
        <Link href="/" className="mt-4 inline-block text-sm font-medium text-flow-ink underline">
          Back to home
        </Link>
      </section>
    );
  }

  // getUser() asks Supabase to confirm who this is, so it can't be faked with a cookie.
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");

  const { saved, deleted } = await searchParams;

  // Claims any workspace invitations sent to this email, and gives a new person a workspace.
  const workspaces = (await prepareWorkspaces(supabase, data.user.id)) ?? [];
  const managed = workspaces.filter((w) => canManageChallenges(w.roles));
  const workspaceName = new Map(workspaces.map((w) => [w.id, w.name]));

  // Row Level Security means this only returns challenges in workspaces where this person is
  // an admin or organiser.
  const { data: rows, error: loadError } = await supabase
    .from("challenges")
    .select("id, title, deadline, status, organization_id")
    .order("created_at", { ascending: false });
  const challenges = rows ?? [];
  // Which challenge each idea belongs to (again limited by the database rules), for the counts.
  const { data: ideaRows, error: ideasError } = challenges.length
    ? await supabase.from("ideas").select("challenge_id")
    : { data: [], error: null };
  if (ideasError) console.error("load idea counts failed", ideasError.code);
  const overview = buildOverview(challenges, (ideaRows ?? []).map((r) => r.challenge_id), todayISO());
  // Challenges where someone invited me to judge (answered by a database function).
  const { data: judgeRows } = await supabase.rpc("my_judging_challenges");
  const judging = Array.isArray(judgeRows) ? (judgeRows as { id: string; title: string; deadline: string }[]) : [];
  const loadFailed = Boolean(loadError);
  if (loadError) console.error("load challenges failed", loadError.code);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-flow-red">
            Innovation Sprint Planner
          </p>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-flow-ink">
            Your challenges
          </h1>
          <p className="mt-1 text-sm text-zinc-800">Signed in as {data.user.email}</p>
        </div>
      </header>

      {!loadFailed && challenges.length > 0 ? <OverviewStrip overview={overview} ideasKnown={!ideasError} /> : null}

      <WorkspaceList workspaces={workspaces} />

      {saved || deleted ? (
        <p role="status" className="rounded-lg border-2 border-flow-ink bg-flow-yellow px-4 py-3 text-sm text-flow-ink">
          {deleted ? "Challenge deleted." : "Challenge saved."}
        </p>
      ) : null}

      {loadFailed ? (
        <p role="alert" className="rounded-lg border-2 border-flow-ink bg-flow-red px-4 py-3 text-sm text-white">
          We couldn&apos;t load your challenges. Reload the page to try again.
        </p>
      ) : challenges.length === 0 && judging.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-xl border-4 border-dashed border-flow-ink bg-white px-6 py-16 text-center">
          <h2 className="font-display text-lg font-black uppercase text-flow-ink">No challenges yet</h2>
          <p className="max-w-md text-sm leading-6 text-zinc-800">
            {managed.length > 0
              ? "Create your first challenge to start planning an innovation sprint."
              : "You aren't an admin or organiser in any workspace yet, so there is nothing to manage here."}
          </p>
          {managed.length > 0 ? <NewChallengeLink /> : null}
        </section>
      ) : null}

      {!loadFailed && challenges.length > 0 ? (
        <section aria-labelledby="challenges-heading" className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h2 id="challenges-heading" className="font-display text-lg font-black uppercase text-flow-ink">
              {challenges.length} {challenges.length === 1 ? "challenge" : "challenges"}
            </h2>
            {managed.length > 0 ? <NewChallengeLink /> : null}
          </div>
          <ul className="flex flex-col gap-3">
            {challenges.map((challenge) => (
              <li key={challenge.id}>
                <Link
                  href={`/dashboard/challenges/${challenge.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-flow-ink bg-white p-5 transition-colors hover:bg-flow-yellow/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink"
                >
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-flow-ink">{challenge.title}</h3>
                    <p className="mt-1 text-sm text-zinc-800">
                      Deadline {formatDate(challenge.deadline)}
                      {!ideasError
                        ? ` · ${overview.ideasByChallenge.get(challenge.id) ?? 0} ${
                            (overview.ideasByChallenge.get(challenge.id) ?? 0) === 1 ? "idea" : "ideas"
                          }`
                        : ""}
                      {managed.length > 1 && workspaceName.get(challenge.organization_id)
                        ? ` · ${workspaceName.get(challenge.organization_id)}`
                        : ""}
                    </p>
                  </div>
                  <span className="rounded-full border-2 border-flow-ink bg-flow-yellow px-3 py-1 text-xs font-semibold capitalize text-flow-ink">
                    {challenge.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {judging.length > 0 ? (
        <section aria-labelledby="judging-heading" className="flex flex-col gap-4">
          <h2 id="judging-heading" className="font-display text-lg font-black uppercase text-flow-ink">
            Challenges you judge
          </h2>
          <ul className="flex flex-col gap-3">
            {judging.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/dashboard/challenges/${c.id}/judging`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-flow-ink bg-white p-5 transition-colors hover:bg-flow-yellow/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink"
                >
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-flow-ink">{c.title}</h3>
                    <p className="mt-1 text-sm text-zinc-800">Deadline {formatDate(c.deadline)}</p>
                  </div>
                  <span className="rounded-full border-2 border-flow-ink bg-flow-pink px-3 py-1 text-xs font-semibold text-flow-ink">
                    Score ideas
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

// Headline numbers for the challenges this person manages.
function OverviewStrip({ overview, ideasKnown }: { overview: Overview; ideasKnown: boolean }) {
  const next = overview.nextDeadline;
  const stats: { label: string; value: string; note?: string }[] = [
    { label: "Challenges", value: String(overview.total) },
    { label: "Published", value: String(overview.published), note: `${overview.drafts} draft${overview.drafts === 1 ? "" : "s"}` },
    ...(ideasKnown ? [{ label: "Ideas received", value: String(overview.ideas) }] : []),
  ];
  return (
    <section aria-labelledby="overview-heading" className="flex flex-col gap-3">
      <h2 id="overview-heading" className="text-sm font-black uppercase tracking-widest text-flow-ink">
        Overview
      </h2>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border-2 border-flow-ink bg-white p-4 shadow-[3px_3px_0_0_#0d0d0d]">
            <dt className="text-xs font-black uppercase tracking-wide text-zinc-700">{s.label}</dt>
            <dd className="mt-1 font-display text-3xl font-black text-flow-ink">{s.value}</dd>
            {s.note ? <dd className="text-xs text-zinc-700">{s.note}</dd> : null}
          </div>
        ))}
        <div className="col-span-2 rounded-xl border-2 border-flow-ink bg-flow-yellow p-4 shadow-[3px_3px_0_0_#0d0d0d] sm:col-span-1">
          <dt className="text-xs font-black uppercase tracking-wide text-flow-ink">Next deadline</dt>
          {next ? (
            <>
              <dd className="mt-1 text-base font-black text-flow-ink">{daysLeftLabel(next.daysLeft)}</dd>
              <dd className="truncate text-xs text-flow-ink">
                <Link href={`/dashboard/challenges/${next.id}`} className="underline">
                  {next.title}
                </Link>
              </dd>
            </>
          ) : (
            <dd className="mt-1 text-sm text-flow-ink">None coming up</dd>
          )}
        </div>
      </dl>
    </section>
  );
}

// The workspaces this person belongs to, each linking to its members and settings.
function WorkspaceList({ workspaces }: { workspaces: Workspace[] }) {
  if (workspaces.length === 0) return null;
  return (
    <section aria-labelledby="workspaces-heading" className="flex flex-col gap-2">
      <h2 id="workspaces-heading" className="text-sm font-black uppercase tracking-widest text-flow-ink">
        {workspaces.length === 1 ? "Your workspace" : "Your workspaces"}
      </h2>
      <ul className="flex flex-wrap gap-2">
        {workspaces.map((w) => (
          <li key={w.id}>
            <Link
              href={`/dashboard/organizations/${w.id}`}
              className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-flow-ink bg-white px-3 py-2 text-sm text-flow-ink transition-colors hover:bg-flow-yellow/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink"
            >
              <span className="font-bold">{w.name}</span>
              <span className="text-xs text-zinc-700">{w.roles.map((r) => ROLE_LABELS[r]).join(", ")}</span>
              <span aria-hidden className="font-bold">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NewChallengeLink() {
  return (
    <Link
      href="/dashboard/challenges/new"
      className="inline-block rounded-lg border-2 border-flow-ink bg-flow-yellow shadow-[3px_3px_0_0_#0d0d0d] px-4 py-2 text-sm font-black uppercase text-flow-ink transition-colors hover:bg-flow-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink"
    >
      New challenge
    </Link>
  );
}
