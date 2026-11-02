import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Dropdown } from "@/components/dropdown";
import { APP_NAME } from "@/lib/config";
import { isChallengeId } from "@/lib/challenges/ids";
import { parsePublicChallenge } from "@/lib/challenges/public";
import { isClosed } from "@/lib/ideas/schema";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/validation/challenge";
import { submitIdea } from "./actions";
import { IdeaForm } from "./idea-form";

// Public, read-only page for a published challenge. No sign-in needed.
// "noindex" asks search engines not to list it: it is shared by link, not advertised.
export const metadata = {
  title: `Challenge · ${APP_NAME}`,
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ id: string }> };

export default function PublicChallengePage({ params }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl border-2 border-flow-ink bg-flow-yellow" aria-hidden />}>
        <PublicChallenge params={params} />
      </Suspense>
    </main>
  );
}

async function PublicChallenge({ params }: Props) {
  const { id } = await params;
  if (!isChallengeId(id)) notFound();

  const supabase = await createClient();
  if (!supabase) {
    return (
      <p className="rounded-xl border-2 border-flow-ink bg-flow-yellow p-5 text-flow-ink">
        The database connection hasn&apos;t been set up yet.
      </p>
    );
  }

  // The database function only answers for published challenges, so a draft, a deleted
  // challenge and a made-up id all look the same: "not found".
  const { data, error } = await supabase.rpc("get_public_challenge", { p_id: id });
  if (error) {
    console.error("load public challenge failed", error.code);
    return (
      <p role="alert" className="rounded-xl border-2 border-flow-ink bg-flow-red p-5 text-white">
        We couldn&apos;t load this challenge. Reload the page to try again.
      </p>
    );
  }
  const challenge = parsePublicChallenge(data);
  if (!challenge) notFound();

  return (
    <>
      <header className="flex flex-col gap-3">
        <p className="text-sm font-black uppercase tracking-widest text-flow-red">Innovation challenge</p>
        <h1 className="font-display text-4xl font-black uppercase tracking-tight text-flow-ink">{challenge.title}</h1>
        <p className="text-sm text-zinc-800">Deadline {formatDate(challenge.deadline)}</p>
      </header>

      {/* Each part is a dropdown that starts closed, so visitors see only the titles and open
          what they want to read. <details> is built into browsers: no JavaScript needed. */}
      <div className="flex flex-col gap-4">
        {challenge.brief ? (
          <Dropdown title="Brief">
            <p className="whitespace-pre-line text-flow-ink">{challenge.brief}</p>
          </Dropdown>
        ) : null}

        <Dropdown title="Business problem & Objectives">
          <dl className="flex flex-col gap-6">
            <Detail label="Business problem" value={challenge.business_problem} />
            <Detail label="Objectives" value={challenge.objectives} />
            <Detail label="Who can take part" value={challenge.target_participants} />
          </dl>
        </Dropdown>

        {challenge.criteria.length > 0 ? (
          <Dropdown title="How entries are judged">
            <ul className="flex flex-col gap-2">
              {challenge.criteria.map((c, i) => (
                <li key={i} className="rounded-lg border-2 border-flow-ink bg-white p-3">
                  <p className="font-medium text-flow-ink">
                    {c.name} <span className="text-zinc-700">· {c.weight}%</span>
                  </p>
                  {c.description ? <p className="mt-1 text-sm text-zinc-800">{c.description}</p> : null}
                </li>
              ))}
            </ul>
          </Dropdown>
        ) : null}

        {challenge.phases.length > 0 ? (
          <Dropdown title="Timeline">
            <ol className="flex flex-col gap-2">
              {challenge.phases.map((p, i) => (
                <li key={i} className="rounded-lg border-2 border-flow-ink bg-white p-3">
                  <p className="font-medium text-flow-ink">{p.name}</p>
                  <p className="text-sm text-zinc-800">
                    {formatDate(p.starts_on)} – {formatDate(p.ends_on)}
                  </p>
                  {p.description ? <p className="mt-1 text-sm text-zinc-800">{p.description}</p> : null}
                </li>
              ))}
            </ol>
          </Dropdown>
        ) : null}
      </div>

      <section aria-labelledby="idea-heading" className="flex flex-col gap-4 border-t-4 border-flow-ink pt-6">
        <h2 id="idea-heading" className="font-display text-xl font-black uppercase text-flow-ink">
          Share your idea
        </h2>
        {isClosed(challenge.deadline, todayISO()) ? (
          <p className="rounded-xl border-2 border-flow-ink bg-white p-5 text-flow-ink">
            Submissions for this challenge closed on {formatDate(challenge.deadline)}.
          </p>
        ) : (
          <IdeaForm action={submitIdea.bind(null, id)} />
        )}
      </section>

      <p className="border-t-4 border-flow-ink pt-6 text-sm text-zinc-800">
        Made with{" "}
        <Link href="/" className="font-medium text-flow-blue hover:underline">
          {APP_NAME}
        </Link>
        .
      </p>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm font-medium text-zinc-700">{label}</dt>
      <dd className="whitespace-pre-line text-flow-ink">{value}</dd>
    </div>
  );
}
