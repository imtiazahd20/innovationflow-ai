import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { isChallengeId } from "@/lib/challenges/ids";
import type { Challenge } from "@/lib/challenges/types";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { deleteChallenge } from "./actions";
import { DeleteButton } from "./delete-button";

export const metadata = { title: `Challenge · ${APP_NAME}` };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string; planned?: string }>;
};

export default function ChallengePage({ params, searchParams }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <Link href="/dashboard" className="text-sm font-medium text-teal-700 hover:underline">
        ← Your challenges
      </Link>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-zinc-100" aria-hidden />}>
        <ChallengeDetail params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ChallengeDetail({ params, searchParams }: Props) {
  const { id } = await params;
  const { updated, planned } = await searchParams;
  if (!isChallengeId(id)) notFound();

  const supabase = await createClient();
  if (!supabase) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
        The database connection hasn&apos;t been set up yet.
      </p>
    );
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  // Row Level Security hides other people's challenges, so a stranger's id looks the same
  // as an id that doesn't exist: "not found".
  const { data, error } = await supabase
    .from("challenges")
    .select("id, title, business_problem, objectives, target_participants, deadline, status, created_at, updated_at, brief")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("load challenge failed", error.code);
    return (
      <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
        We couldn&apos;t load this challenge. Reload the page to try again.
      </p>
    );
  }
  if (!data) notFound();
  const { brief, ...base } = data;
  const challenge = base as Challenge;

  // Plan rows are optional: a challenge starts with none. A load problem here shouldn't
  // hide the challenge itself, so we fall back to showing "not set yet".
  const [criteriaResult, phasesResult] = await Promise.all([
    supabase.from("judging_criteria").select("id, name, description, weight").eq("challenge_id", id).order("position"),
    supabase.from("timeline_phases").select("id, name, description, starts_on, ends_on").eq("challenge_id", id).order("position"),
  ]);
  const criteria = criteriaResult.data ?? [];
  const phases = phasesResult.data ?? [];

  return (
    <>
      {updated || planned ? (
        <p role="status" className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          {planned ? "Plan saved." : "Changes saved."}
        </p>
      ) : null}

      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold capitalize text-zinc-700">
            {challenge.status}
          </span>
          <span className="text-sm text-zinc-600">Deadline {formatDate(challenge.deadline)}</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{challenge.title}</h1>
      </header>

      <dl className="flex flex-col gap-6">
        <Detail label="Business problem" value={challenge.business_problem} />
        <Detail label="Objectives" value={challenge.objectives} />
        <Detail label="Target participants" value={challenge.target_participants} />
      </dl>

      <section aria-labelledby="plan-heading" className="flex flex-col gap-6 border-t border-zinc-200 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="plan-heading" className="text-xl font-semibold text-zinc-900">
            Brief, criteria and timeline
          </h2>
          <Link
            href={`/dashboard/challenges/${challenge.id}/plan`}
            className="rounded-lg border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-800 transition-colors hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            {brief || criteria.length > 0 || phases.length > 0 ? "Edit plan" : "Create plan"}
          </Link>
        </div>

        {brief || criteria.length > 0 || phases.length > 0 ? (
          <>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-medium text-zinc-500">Brief</h3>
              {brief ? (
                <p className="whitespace-pre-line text-zinc-900">{brief}</p>
              ) : (
                <p className="text-sm text-zinc-500">Not written yet.</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-zinc-500">Judging criteria</h3>
              {criteria.length === 0 ? (
                <p className="text-sm text-zinc-500">None yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {criteria.map((c) => (
                    <li key={c.id} className="rounded-lg border border-zinc-200 bg-white p-3">
                      <p className="font-medium text-zinc-900">
                        {c.name} <span className="text-zinc-500">· {c.weight}%</span>
                      </p>
                      {c.description ? <p className="mt-1 text-sm text-zinc-600">{c.description}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-zinc-500">Timeline</h3>
              {phases.length === 0 ? (
                <p className="text-sm text-zinc-500">None yet.</p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {phases.map((p) => (
                    <li key={p.id} className="rounded-lg border border-zinc-200 bg-white p-3">
                      <p className="font-medium text-zinc-900">{p.name}</p>
                      <p className="text-sm text-zinc-600">
                        {formatDate(p.starts_on)} – {formatDate(p.ends_on)}
                      </p>
                      {p.description ? <p className="mt-1 text-sm text-zinc-600">{p.description}</p> : null}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-zinc-600">
            No plan yet. Create one to write the brief, set how entries are judged and lay out the timeline. You can
            start from an automatic draft.
          </p>
        )}
      </section>

      <div className="flex flex-wrap items-start gap-3 border-t border-zinc-200 pt-6">
        <Link
          href={`/dashboard/challenges/${challenge.id}/edit`}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        >
          Edit
        </Link>
        <DeleteButton action={deleteChallenge.bind(null, challenge.id)} />
      </div>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm font-medium text-zinc-500">{label}</dt>
      {/* whitespace-pre-line keeps the line breaks the person typed. */}
      <dd className="whitespace-pre-line text-zinc-900">{value}</dd>
    </div>
  );
}
