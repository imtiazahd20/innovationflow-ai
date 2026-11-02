"use client";

import { useRef, useState } from "react";
import { formatDate } from "@/lib/format";

export type IdeaCard = {
  id: string;
  submitter_name: string;
  submitter_email: string;
  title: string;
  description: string;
  created_at: string;
};

// Shows ideas as small cards. Clicking a card opens the full idea in a pop-up.
// The pop-up is a native <dialog>: the browser gives us the dimmed background, the Escape
// key and keyboard focus handling for free. Its animation lives in globals.css (.idea-dialog).
export function IdeaCards({ ideas }: { ideas: IdeaCard[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const selected = ideas.find((i) => i.id === openId) ?? null;

  function open(id: string) {
    setOpenId(id);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
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
              <span className="text-xs font-black uppercase tracking-widest text-flow-red">{idea.submitter_name}</span>
              <span className="font-display text-lg font-black uppercase leading-tight text-flow-ink">{idea.title}</span>
              <span className="line-clamp-2 text-sm text-zinc-800">{idea.description}</span>
              <span className="mt-auto pt-1 text-xs text-zinc-700">{formatDate(idea.created_at)} · Read more</span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        onClose={() => setOpenId(null)}
        onClick={(e) => {
          // A click on the dimmed backdrop lands on the <dialog> itself, not on its content.
          if (e.target === e.currentTarget) close();
        }}
        aria-labelledby="idea-dialog-title"
        className="idea-dialog m-auto w-[min(92vw,40rem)] max-h-[85vh] overflow-y-auto rounded-2xl border-4 border-flow-ink bg-white p-0 text-flow-ink shadow-[8px_8px_0_0_#0d0d0d]"
      >
        {selected ? (
          <div className="flex flex-col gap-4 p-6">
            <div className="flex items-start justify-between gap-4">
              <h3 id="idea-dialog-title" className="font-display text-2xl font-black uppercase leading-tight">
                {selected.title}
              </h3>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="shrink-0 cursor-pointer rounded-lg border-2 border-flow-ink bg-flow-yellow px-3 py-1 text-sm font-black uppercase hover:bg-flow-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink"
              >
                Close
              </button>
            </div>
            <p className="text-sm text-zinc-800">
              {selected.submitter_name} ·{" "}
              <a href={`mailto:${selected.submitter_email}`} className="text-flow-blue hover:underline">
                {selected.submitter_email}
              </a>{" "}
              · {formatDate(selected.created_at)}
            </p>
            <p className="whitespace-pre-line break-words text-flow-ink">{selected.description}</p>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
