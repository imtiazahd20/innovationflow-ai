import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/login/actions";
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
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-zinc-100" aria-hidden />}>
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
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-xl font-semibold text-amber-950">Database not connected yet</h1>
        <p className="mt-2 text-amber-900">
          The dashboard needs the Supabase connection settings. Once they are added, sign in
          again and your challenges will appear here.
        </p>
        <Link href="/" className="mt-4 inline-block text-sm font-medium text-amber-950 underline">
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
          <p className="text-sm font-semibold uppercase tracking-widest text-teal-700">
            Innovation Sprint Planner
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Your challenges
          </h1>
          <p className="mt-1 text-sm text-zinc-600">Signed in as {data.user.email}</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            Sign out
          </button>
        </form>
      </header>

      {saved || deleted ? (
        <p role="status" className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          {deleted ? "Challenge deleted." : "Challenge saved."}
        </p>
      ) : null}

      {loadFailed ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          We couldn&apos;t load your challenges. Reload the page to try again.
        </p>
      ) : challenges.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
          <h2 className="text-lg font-semibold text-zinc-900">No challenges yet</h2>
          <p className="max-w-md text-sm leading-6 text-zinc-600">
            Create your first challenge to start planning an innovation sprint.
          </p>
          <NewChallengeLink />
        </section>
      ) : (
        <section aria-labelledby="challenges-heading" className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h2 id="challenges-heading" className="text-lg font-semibold text-zinc-900">
              {challenges.length} {challenges.length === 1 ? "challenge" : "challenges"}
            </h2>
            <NewChallengeLink />
          </div>
          <ul className="flex flex-col gap-3">
            {challenges.map((challenge) => (
              <li key={challenge.id}>
                <Link
                  href={`/dashboard/challenges/${challenge.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-teal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                >
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-zinc-900">{challenge.title}</h3>
                    <p className="mt-1 text-sm text-zinc-600">Deadline {formatDate(challenge.deadline)}</p>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold capitalize text-zinc-700">
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
      className="inline-block rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
    >
      New challenge
    </Link>
  );
}
