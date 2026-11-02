import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DiscussionBoard } from "@/components/discussion/board";
import { APP_NAME } from "@/lib/config";
import { isChallengeId } from "@/lib/challenges/ids";
import { parseDiscussion } from "@/lib/discussion/schema";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { postParticipantComment } from "./actions";

// Private to people who submitted an idea: the address contains their key. Not for search engines.
export const metadata = {
  title: `Discussion · ${APP_NAME}`,
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ id: string; token: string }> };

export default function ParticipantDiscussionPage({ params }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl border-2 border-flow-ink bg-flow-yellow" aria-hidden />}>
        <Discussion params={params} />
      </Suspense>
    </main>
  );
}

async function Discussion({ params }: Props) {
  const { id, token } = await params;
  if (!isChallengeId(id) || !isChallengeId(token)) notFound();

  const supabase = await createClient();
  if (!supabase) {
    return (
      <p className="rounded-xl border-2 border-flow-ink bg-flow-yellow p-5 text-flow-ink">
        The database connection hasn&apos;t been set up yet.
      </p>
    );
  }

  // The database function returns nothing unless the key belongs to an idea of this challenge.
  const { data, error } = await supabase.rpc("get_discussion", { p_challenge_id: id, p_token: token });
  if (error) {
    console.error("load discussion failed", error.code);
    return (
      <p role="alert" className="rounded-xl border-2 border-flow-ink bg-flow-red p-5 text-white">
        We couldn&apos;t load the discussion. Reload the page to try again.
      </p>
    );
  }
  const discussion = parseDiscussion(data);
  if (!discussion) notFound();

  return (
    <>
      <header className="flex flex-col gap-3">
        <p className="text-sm font-black uppercase tracking-widest text-flow-red">Idea discussion</p>
        <h1 className="font-display text-4xl font-black uppercase tracking-tight text-flow-ink">{discussion.challenge.title}</h1>
        <p className="text-sm text-zinc-800">
          Deadline {formatDate(discussion.challenge.deadline)} · You are signed in as{" "}
          <strong>{discussion.viewer.name}</strong> through your private link. Everyone who sent an idea to this challenge,
          plus the judges and organisers, can read and comment here. Emails are never shown.
        </p>
      </header>

      <DiscussionBoard
        discussion={discussion}
        uploadFolder={`t/${token}`}
        postAction={postParticipantComment.bind(null, id, token)}
      />

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
