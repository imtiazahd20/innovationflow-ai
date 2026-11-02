import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DiscussionBoard } from "@/components/discussion/board";
import { APP_NAME } from "@/lib/config";
import { isChallengeId } from "@/lib/challenges/ids";
import { parseDiscussion } from "@/lib/discussion/schema";
import { createClient } from "@/lib/supabase/server";
import { deleteComment, postStaffComment } from "./actions";

export const metadata = { title: `Discussion · ${APP_NAME}` };

type Props = { params: Promise<{ id: string }> };

export default function StaffDiscussionPage({ params }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl border-2 border-flow-ink bg-flow-yellow" aria-hidden />}>
        <Discussion params={params} />
      </Suspense>
    </main>
  );
}

async function Discussion({ params }: Props) {
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

  const { data, error } = await supabase.rpc("get_discussion", { p_challenge_id: id, p_token: null });
  if (error) {
    console.error("load discussion failed", error.code);
    return (
      <p role="alert" className="rounded-xl border-2 border-flow-ink bg-flow-red p-5 text-white">
        We couldn&apos;t load the discussion. Reload to try again. If you just updated the app, the Milestone 7 database
        steps may still be missing.
      </p>
    );
  }
  const discussion = parseDiscussion(data);
  if (!discussion) notFound();
  const isOwner = discussion.viewer.role === "owner";

  return (
    <>
      <Link
        href={isOwner ? `/dashboard/challenges/${id}` : "/dashboard"}
        className="text-sm font-medium text-flow-blue hover:underline"
      >
        ← {isOwner ? "Back to the challenge" : "Your dashboard"}
      </Link>
      <header className="flex flex-col gap-3">
        <p className="text-sm font-black uppercase tracking-widest text-flow-red">Idea discussion</p>
        <h1 className="font-display text-3xl font-black uppercase tracking-tight text-flow-ink">{discussion.challenge.title}</h1>
        <p className="text-sm text-zinc-800">
          Everyone who sent an idea, plus the judges and you, can read and comment here.{" "}
          <Link href={`/dashboard/challenges/${id}/judging`} className="font-bold text-flow-blue hover:underline">
            Go to judging
          </Link>
        </p>
      </header>
      <DiscussionBoard
        discussion={discussion}
        uploadFolder={`c/${id}`}
        postAction={postStaffComment.bind(null, id)}
        deleteAction={isOwner ? deleteComment.bind(null, id) : undefined}
      />
    </>
  );
}
