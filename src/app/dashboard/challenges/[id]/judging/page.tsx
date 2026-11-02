import { Suspense } from "react";
import Link from "next/link";
import { ChallengeTabs } from "../challenge-tabs";
import { notFound, redirect } from "next/navigation";
import { Dropdown } from "@/components/dropdown";
import { APP_NAME } from "@/lib/config";
import { isChallengeId } from "@/lib/challenges/ids";
import { formatDate } from "@/lib/format";
import { myScores, parseJudging, rankFromTotals, rankIdeas } from "@/lib/judging/scoring";
import { createClient } from "@/lib/supabase/server";
import { addJudge, removeJudge, saveIdeaScores } from "./actions";
import { JudgesPanel } from "./judges-panel";
import { ScoreForm } from "./score-form";
import { CommentThread } from "@/components/discussion/thread";
import { parseDiscussion } from "@/lib/discussion/schema";
import { deleteComment, postStaffComment } from "../discuss/actions";

export const metadata = { title: `Judging · ${APP_NAME}` };

type Props = { params: Promise<{ id: string }> };

export default function JudgingPage({ params }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl border-2 border-flow-ink bg-flow-yellow" aria-hidden />}>
        <Judging params={params} />
      </Suspense>
    </main>
  );
}

async function Judging({ params }: Props) {
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
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");
  const userId = userData.user.id;

  // The database function answers only for the owner and invited judges.
  const { data, error } = await supabase.rpc("get_judging", { p_challenge_id: id });
  if (error) {
    console.error("load judging failed", error.code);
    return (
      <p role="alert" className="rounded-xl border-2 border-flow-ink bg-flow-red p-5 text-white">
        We couldn&apos;t load the judging page. Reload to try again. If you just updated the app, the Milestone 7 database
        step may still be missing.
      </p>
    );
  }
  const judging = parseJudging(data);
  if (!judging) notFound();

  const { role, challenge, criteria, ideas, scores, judges, totals } = judging;
  // Everyone sees the same combined totals. If the database step for totals is missing, fall back
  // to computing them here (judges would then see only their own scores).
  const ranked = totals ? rankFromTotals(ideas, totals) : rankIdeas(ideas, criteria, scores);
  // Comments for each idea, so judges and the owner can talk right here next to the scores.
  const { data: discussionData } = await supabase.rpc("get_discussion", { p_challenge_id: id, p_token: null });
  const discussion = parseDiscussion(discussionData);
  const isOwner = role === "owner";

  return (
    <>
      <Link
        href={isOwner ? `/dashboard/challenges/${challenge.id}` : "/dashboard"}
        className="text-sm font-medium text-flow-blue hover:underline"
      >
        ← {isOwner ? "Back to the challenge" : "Your dashboard"}
      </Link>

      <ChallengeTabs id={challenge.id} current="judging" canEdit={isOwner} />
      <header className="flex flex-col gap-2">
        <p className="text-sm font-black uppercase tracking-widest text-flow-red">Judging</p>
        <h1 className="font-display text-3xl font-black uppercase tracking-tight text-flow-ink">{challenge.title}</h1>
        <p className="text-sm text-zinc-800">
          {isOwner
            ? "You see the combined ranking from all judges."
            : "Everyone sees each idea's total score. You see only your own individual scores."}{" "}
          <Link href={`/dashboard/challenges/${challenge.id}/discuss`} className="font-bold text-flow-blue hover:underline">
            Open the discussion
          </Link>
        </p>
      </header>

      {isOwner ? (
        <JudgesPanel
          judges={judges}
          addAction={addJudge.bind(null, challenge.id)}
          removeAction={removeJudge.bind(null, challenge.id)}
        />
      ) : null}

      <section aria-labelledby="ranking-heading" className="flex flex-col gap-4">
        <h2 id="ranking-heading" className="font-display text-xl font-black uppercase text-flow-ink">
          {isOwner ? "Ranking" : "Ideas to score"} ({ideas.length})
        </h2>

        {criteria.length === 0 ? (
          <p className="rounded-xl border-2 border-flow-ink bg-flow-yellow p-5 text-flow-ink">
            This challenge has no judging criteria yet, so ideas can&apos;t be scored.
            {isOwner ? (
              <>
                {" "}
                <Link href={`/dashboard/challenges/${challenge.id}/plan`} className="font-bold underline">
                  Create the plan
                </Link>{" "}
                first.
              </>
            ) : null}
          </p>
        ) : ideas.length === 0 ? (
          <p className="text-sm text-zinc-800">No ideas have been submitted yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {ranked.map((r) => {
              const mine = Object.fromEntries(myScores(scores, r.idea.id, userId));
              const label = `${r.rank ? `#${r.rank}` : "Not ranked"} · ${r.idea.title}${r.average !== null ? ` · ${r.average.toFixed(1)}/10` : ""}`;
              return (
                <Dropdown key={r.idea.id} title={label}>
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm text-zinc-800">
                        {r.idea.submitter_name} · {formatDate(r.idea.created_at)}
                      </p>
                      <p className="whitespace-pre-line break-words text-flow-ink">{r.idea.description}</p>
                    </div>
                    <p className="text-sm font-medium text-flow-ink">
                      {r.judgesScored === 0
                        ? "Total score: not scored yet. It appears once a judge has scored every category."
                        : `Total score: ${r.average?.toFixed(1)} out of 10 (average of ${r.judgesScored} ${r.judgesScored === 1 ? "judge" : "judges"}).`}
                    </p>
                    <div className="flex flex-col gap-2 border-t-4 border-flow-ink pt-4">
                      <h3 className="font-display text-sm font-black uppercase text-flow-ink">Your scores</h3>
                      <ScoreForm criteria={criteria} initial={mine} action={saveIdeaScores.bind(null, challenge.id, r.idea.id)} />
                    </div>
                    {(() => {
                      const thread = discussion?.ideas.find((i) => i.id === r.idea.id);
                      return thread && discussion ? (
                        <CommentThread
                          idea={thread}
                          viewer={discussion.viewer}
                          uploadFolder={`c/${challenge.id}`}
                          postAction={postStaffComment.bind(null, challenge.id)}
                          deleteAction={isOwner ? deleteComment.bind(null, challenge.id) : undefined}
                          uid={r.idea.id}
                        />
                      ) : null;
                    })()}
                  </div>
                </Dropdown>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
