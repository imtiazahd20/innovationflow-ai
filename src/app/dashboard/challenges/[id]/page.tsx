import { Suspense } from "react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Dropdown } from "@/components/dropdown";
import { APP_NAME } from "@/lib/config";
import { isChallengeId } from "@/lib/challenges/ids";
import type { Challenge } from "@/lib/challenges/types";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { sharePath } from "@/lib/challenges/public";
import { deleteChallenge, setPublished } from "./actions";
import { DeleteButton } from "./delete-button";
import { PublishPanel } from "./publish-panel";

export const metadata = { title: `Challenge · ${APP_NAME}` };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string; planned?: string }>;
};

export default function ChallengePage({ params, searchParams }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <Link href="/dashboard" className="text-sm font-medium text-flow-blue hover:underline">
        ← Your challenges
      </Link>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl border-2 border-flow-ink bg-flow-yellow" aria-hidden />}>
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
      <p className="rounded-xl border-2 border-flow-ink bg-flow-yellow p-5 text-flow-ink">
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
      <p role="alert" className="rounded-xl border-2 border-flow-ink bg-flow-red p-5 text-white">
        We couldn&apos;t load this challenge. Reload the page to try again.
      </p>
    );
  }
  // Not yours (or gone): show the public page, which shows the challenge only if it is
  // published and otherwise says "not found". Strangers can't tell which case it was.
  if (!data) redirect(sharePath(id));
  const { brief, ...base } = data;
  const challenge = base as Challenge;

  // Plan rows are optional: a challenge starts with none. A load problem here shouldn't
  // hide the challenge itself, so we fall back to showing "not set yet".
  const [criteriaResult, phasesResult] = await Promise.all([
    supabase.from("judging_criteria").select("id, name, description, weight").eq("challenge_id", id).order("position"),
    supabase.from("timeline_phases").select("id, name, description, starts_on, ends_on").eq("challenge_id", id).order("position"),
  ]);
  // Ideas sent in through the public page. Only the owner can read them (Row Level Security).
  const ideasResult = await supabase
    .from("ideas")
    .select("id, submitter_name, submitter_email, title, description, created_at")
    .eq("challenge_id", id)
    .order("created_at", { ascending: false });
  const ideas = ideasResult.data ?? [];
  const ideasFailed = Boolean(ideasResult.error);
  if (ideasResult.error) console.error("load ideas failed", ideasResult.error.code);
  const criteria = criteriaResult.data ?? [];
  const phases = phasesResult.data ?? [];

  // Build the full link from the address the person is visiting right now.
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const proto = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const shareUrl = `${proto}://${host}${sharePath(challenge.id)}`;

  return (
    <>
      {updated || planned ? (
        <p role="status" className="rounded-lg border-2 border-flow-ink bg-flow-yellow px-4 py-3 text-sm text-flow-ink">
          {planned ? "Plan saved." : "Changes saved."}
        </p>
      ) : null}

      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-full border-2 border-flow-ink bg-flow-yellow px-3 py-1 text-xs font-semibold capitalize text-flow-ink">
            {challenge.status}
          </span>
          <span className="text-sm text-zinc-800">Deadline {formatDate(challenge.deadline)}</span>
        </div>
        <h1 className="font-display text-3xl font-black uppercase tracking-tight text-flow-ink">{challenge.title}</h1>
      </header>

      {/* The details start closed so the page stays short; click a title to read or edit it. */}
      <div className="flex flex-col gap-4">
        <Dropdown title="Business Problem and Objectives">
          <dl className="flex flex-col gap-6">
            <Detail label="Business problem" value={challenge.business_problem} />
            <Detail label="Objectives" value={challenge.objectives} />
            <Detail label="Target participants" value={challenge.target_participants} />
          </dl>
        </Dropdown>

        <Dropdown title="Brief, Criteria and Timeline">
          <div className="flex flex-col gap-6">
            <div>
              <Link
                href={`/dashboard/challenges/${challenge.id}/plan`}
                className="inline-block rounded-lg border-2 border-flow-ink bg-white px-4 py-2 text-sm font-semibold text-flow-ink transition-colors hover:bg-flow-yellow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink"
              >
                {brief || criteria.length > 0 || phases.length > 0 ? "Edit plan" : "Create plan"}
              </Link>
            </div>

            {brief || criteria.length > 0 || phases.length > 0 ? (
              <>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-medium text-zinc-700">Brief</h3>
                  {brief ? (
                    <p className="whitespace-pre-line text-flow-ink">{brief}</p>
                  ) : (
                    <p className="text-sm text-zinc-700">Not written yet.</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-medium text-zinc-700">Judging criteria</h3>
                  {criteria.length === 0 ? (
                    <p className="text-sm text-zinc-700">None yet.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {criteria.map((c) => (
                        <li key={c.id} className="rounded-lg border-2 border-flow-ink bg-white p-3">
                          <p className="font-medium text-flow-ink">
                            {c.name} <span className="text-zinc-700">· {c.weight}%</span>
                          </p>
                          {c.description ? <p className="mt-1 text-sm text-zinc-800">{c.description}</p> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-medium text-zinc-700">Timeline</h3>
                  {phases.length === 0 ? (
                    <p className="text-sm text-zinc-700">None yet.</p>
                  ) : (
                    <ol className="flex flex-col gap-2">
                      {phases.map((p) => (
                        <li key={p.id} className="rounded-lg border-2 border-flow-ink bg-white p-3">
                          <p className="font-medium text-flow-ink">{p.name}</p>
                          <p className="text-sm text-zinc-800">
                            {formatDate(p.starts_on)} – {formatDate(p.ends_on)}
                          </p>
                          {p.description ? <p className="mt-1 text-sm text-zinc-800">{p.description}</p> : null}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-800">
                No plan yet. Create one to write the brief, set how entries are judged and lay out the timeline. You
                can start from an automatic draft.
              </p>
            )}
          </div>
        </Dropdown>
      </div>

      <section aria-labelledby="ideas-heading" className="flex flex-col gap-4 border-t-4 border-flow-ink pt-6">
        <h2 id="ideas-heading" className="font-display text-xl font-black uppercase text-flow-ink">
          Ideas received ({ideas.length})
        </h2>
        {ideasFailed ? (
          <p role="alert" className="rounded-lg border-2 border-flow-ink bg-flow-red px-4 py-3 text-sm text-white">
            We couldn&apos;t load the ideas. Reload the page to try again.
          </p>
        ) : ideas.length === 0 ? (
          <p className="text-sm text-zinc-800">
            {challenge.status === "published"
              ? "No ideas yet. Share the link above and they will appear here."
              : "Publish the challenge and share its link to start receiving ideas."}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {ideas.map((idea) => (
              <li key={idea.id} className="rounded-lg border-2 border-flow-ink bg-white p-4">
                <h3 className="font-bold text-flow-ink">{idea.title}</h3>
                <p className="mt-1 text-sm text-zinc-800">
                  {idea.submitter_name} ·{" "}
                  <a href={`mailto:${idea.submitter_email}`} className="text-flow-blue hover:underline">
                    {idea.submitter_email}
                  </a>{" "}
                  · {formatDate(idea.created_at)}
                </p>
                <p className="mt-2 whitespace-pre-line text-flow-ink">{idea.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PublishPanel
        key={challenge.status}
        published={challenge.status === "published"}
        shareUrl={shareUrl}
        action={setPublished.bind(null, challenge.id)}
      />

      <div className="flex flex-wrap items-start gap-3 border-t-4 border-flow-ink pt-6">
        <Link
          href={`/dashboard/challenges/${challenge.id}/edit`}
          className="rounded-lg border-2 border-flow-ink bg-flow-yellow shadow-[3px_3px_0_0_#0d0d0d] px-4 py-2 text-sm font-black uppercase text-flow-ink transition-colors hover:bg-flow-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink"
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
      <dt className="text-sm font-medium text-zinc-700">{label}</dt>
      {/* whitespace-pre-line keeps the line breaks the person typed. */}
      <dd className="whitespace-pre-line text-flow-ink">{value}</dd>
    </div>
  );
}
