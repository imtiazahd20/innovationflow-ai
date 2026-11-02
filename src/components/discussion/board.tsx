"use client";

import { useRef, useState } from "react";
import { formatDate } from "@/lib/format";
import type { Discussion, PostResult, UploadedFile } from "@/lib/discussion/schema";
import { CommentThread } from "./thread";

type Idea = Discussion["ideas"][number];

// The idea's total score, written the same way everywhere.
function scoreLabel(idea: Idea): string {
  if (idea.average == null) return "Not scored yet";
  return `Score ${idea.average.toFixed(1)}/10${idea.rank ? ` · #${idea.rank}` : ""}`;
}

type Props = {
  discussion: Discussion;
  // The folder uploads go into: "t/<private key>" for participants, "c/<challenge id>" for staff.
  uploadFolder: string;
  // Posts the comment (a server action already tied to this challenge).
  postAction: (ideaId: string, body: string, files: UploadedFile[]) => Promise<PostResult>;
  // Only the owner gets this: removes one comment.
  deleteAction?: (commentId: string) => Promise<void>;
  // Only the owner gets this: each submitter's email and private discussion address.
  ownerInfo?: Record<string, { email: string; path: string }>;
};

// All ideas of a challenge as small cards. A click opens the idea with its comment thread.
export function DiscussionBoard({ discussion, uploadFolder, postAction, deleteAction, ownerInfo }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const { ideas, viewer } = discussion;
  const selected = ideas.find((i) => i.id === openId) ?? null;

  function open(id: string) {
    setOpenId(id);
    dialogRef.current?.showModal();
  }
  const close = () => dialogRef.current?.close();

  if (ideas.length === 0) {
    return <p className="text-sm text-zinc-800">No ideas have been submitted yet. Check back soon.</p>;
  }

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2">
        {ideas.map((idea) => (
          <li key={idea.id}>
            <button
              type="button"
              onClick={() => open(idea.id)}
              aria-haspopup="dialog"
              className="flex h-full w-full cursor-pointer flex-col gap-2 rounded-2xl border-4 border-flow-ink bg-white p-4 text-left shadow-[4px_4px_0_0_#0d0d0d] transition-transform hover:-translate-y-1 hover:bg-flow-yellow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink"
            >
              <span className="text-xs font-black uppercase tracking-widest text-flow-red">
                {idea.submitter_name}
                {idea.id === viewer.idea_id ? " · your idea" : ""}
              </span>
              <span className="font-display text-lg font-black uppercase leading-tight text-flow-ink">{idea.title}</span>
              <span className="line-clamp-2 text-sm text-zinc-800">{idea.description}</span>
              <span className="w-fit rounded-full border-2 border-flow-ink bg-flow-yellow px-2 py-0.5 text-xs font-black text-flow-ink">
                {scoreLabel(idea)}
              </span>
              <span className="mt-auto pt-1 text-xs text-zinc-700">
                {idea.comments.length} {idea.comments.length === 1 ? "comment" : "comments"} · Open
              </span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        onClose={() => setOpenId(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        aria-labelledby="discussion-dialog-title"
        className="idea-dialog m-auto w-[min(94vw,44rem)] max-h-[88vh] overflow-y-auto rounded-2xl border-4 border-flow-ink bg-white p-0 text-flow-ink shadow-[8px_8px_0_0_#0d0d0d]"
      >
        {selected ? (
          <div className="flex flex-col gap-5 p-6">
            <div className="flex items-start justify-between gap-4">
              <h3 id="discussion-dialog-title" className="font-display text-2xl font-black uppercase leading-tight">
                {selected.title}
              </h3>
              <button
                type="button"
                onClick={close}
                className="shrink-0 cursor-pointer rounded-lg border-2 border-flow-ink bg-flow-yellow px-3 py-1 text-sm font-black uppercase hover:bg-flow-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink"
              >
                Close
              </button>
            </div>
            <p className="text-sm text-zinc-800">
              {selected.submitter_name} · {formatDate(selected.created_at)}
            </p>
            <p className="whitespace-pre-line break-words">{selected.description}</p>
            <p className="rounded-xl border-2 border-flow-ink bg-flow-yellow p-3 text-sm font-medium">
              {selected.average == null
                ? "Total score: not scored yet. It appears once a judge has scored every category."
                : `Total score: ${selected.average.toFixed(1)} out of 10${selected.rank ? ` · rank #${selected.rank}` : ""} · average of ${selected.judges_scored ?? 0} ${selected.judges_scored === 1 ? "judge" : "judges"}`}
            </p>
            {ownerInfo?.[selected.id] ? (
              <div className="flex flex-col gap-1 rounded-xl border-2 border-dashed border-flow-ink p-3 text-sm">
                <p>
                  <strong>Submitter email (only you see this):</strong>{" "}
                  <a href={`mailto:${ownerInfo[selected.id].email}`} className="text-flow-blue hover:underline">
                    {ownerInfo[selected.id].email}
                  </a>
                </p>
                <label htmlFor="private-link" className="font-medium">
                  Their private discussion link (send it if they lost theirs):
                </label>
                <input
                  id="private-link"
                  readOnly
                  value={`${typeof window === "undefined" ? "" : window.location.origin}${ownerInfo[selected.id].path}`}
                  onFocus={(e) => e.currentTarget.select()}
                  className="rounded-lg border-2 border-flow-ink bg-white px-2 py-1 text-xs"
                />
              </div>
            ) : null}

            <CommentThread
              key={selected.id}
              idea={selected}
              viewer={viewer}
              uploadFolder={uploadFolder}
              postAction={postAction}
              deleteAction={deleteAction}
            />
          </div>
        ) : null}
      </dialog>
    </>
  );
}
