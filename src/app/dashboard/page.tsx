import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

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

  // Row Level Security means this only ever returns the signed-in person's own challenges.
  const { data: rows, error: loadError } = await supabase
    .from("challenges")
    .select("id, title, deadline, status")
    .order("created_at", { ascending: false });
  const challenges = rows ?? [];
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

      {saved || deleted ? (
        <p role="status" className="rounded-lg border-2 border-flow-ink bg-flow-yellow px-4 py-3 text-sm text-flow-ink">
          {deleted ? "Challenge deleted." : "Challenge saved."}
        </p>
      ) : null}

      {loadFailed ? (
        <p role="alert" className="rounded-lg border-2 border-flow-ink bg-flow-red px-4 py-3 text-sm text-white">
          We couldn&apos;t load your challenges. Reload the page to try again.
        </p>
      ) : challenges.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-xl border-4 border-dashed border-flow-ink bg-white px-6 py-16 text-center">
          <h2 className="font-display text-lg font-black uppercase text-flow-ink">No challenges yet</h2>
          <p className="max-w-md text-sm leading-6 text-zinc-800">
            Create your first challenge to start planning an innovation sprint.
          </p>
          <NewChallengeLink />
        </section>
      ) : (
        <section aria-labelledby="challenges-heading" className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h2 id="challenges-heading" className="font-display text-lg font-black uppercase text-flow-ink">
              {challenges.length} {challenges.length === 1 ? "challenge" : "challenges"}
            </h2>
            <NewChallengeLink />
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
                    <p className="mt-1 text-sm text-zinc-800">Deadline {formatDate(challenge.deadline)}</p>
                  </div>
                  <span className="rounded-full border-2 border-flow-ink bg-flow-yellow px-3 py-1 text-xs font-semibold capitalize text-flow-ink">
                    {challenge.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
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
