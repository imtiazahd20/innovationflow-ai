"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { formatDate } from "@/lib/format";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  ACCEPT_ATTRIBUTE,
  ALLOWED_TYPES,
  MAX_FILES,
  formatSize,
  publicFileUrl,
  validateComment,
  validateFiles,
  type Discussion,
  type PostResult,
  type UploadedFile,
} from "@/lib/discussion/schema";

const ROLE_LABEL = { submitter: "Participant", judge: "Judge", owner: "Organiser" } as const;
const ROLE_COLOR = { submitter: "bg-white", judge: "bg-flow-pink", owner: "bg-flow-yellow" } as const;

type Props = {
  discussion: Discussion;
  // The folder uploads go into: "t/<private key>" for participants, "c/<challenge id>" for staff.
  uploadFolder: string;
  // Posts the comment (a server action already tied to this challenge).
  postAction: (ideaId: string, body: string, files: UploadedFile[]) => Promise<PostResult>;
  // Only the owner gets this: removes one comment.
  deleteAction?: (commentId: string) => Promise<void>;
};

// All ideas of a challenge as small cards. A click opens the idea with its comment thread.
export function DiscussionBoard({ discussion, uploadFolder, postAction, deleteAction }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [busy, startTransition] = useTransition();
  const [, startRefresh] = useTransition();

  const { ideas, viewer } = discussion;
  const selected = ideas.find((i) => i.id === openId) ?? null;
  const env = getSupabaseEnv();

  function open(id: string) {
    setOpenId(id);
    setBody("");
    setFiles([]);
    setError(undefined);
    dialogRef.current?.showModal();
  }
  const close = () => dialogRef.current?.close();

  function pickFiles(list: FileList | null) {
    const picked = Array.from(list ?? []);
    const next = [...files, ...picked];
    const problem = validateFiles(next.map((f) => ({ name: f.name, type: f.type, size: f.size })));
    if (problem) {
      setError(problem);
    } else {
      setError(undefined);
      setFiles(next);
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function send() {
    if (!selected) return;
    const problem =
      validateComment(body) ?? validateFiles(files.map((f) => ({ name: f.name, type: f.type, size: f.size })));
    if (problem) return setError(problem);
    if (!env) return setError("The database connection hasn't been set up yet.");
    setError(undefined);

    startTransition(async () => {
      const uploaded: UploadedFile[] = [];
      if (files.length > 0) {
        const supabase = createBrowserClient(env.url, env.key);
        for (const f of files) {
          // A random file name: the real name is stored separately and shown as text only.
          const path = `${uploadFolder}/${crypto.randomUUID()}.${ALLOWED_TYPES[f.type]}`;
          const { error: upError } = await supabase.storage
            .from("idea-files")
            .upload(path, f, { contentType: f.type, upsert: false });
          if (upError) {
            setError(`We couldn't upload "${f.name}". Please try again.`);
            return;
          }
          uploaded.push({ path, name: f.name, type: f.type, size: f.size });
        }
      }
      const result = await postAction(selected.id, body, uploaded);
      if (result.error) return setError(result.error);
      setBody("");
      setFiles([]);
      router.refresh();
    });
  }

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

            <section aria-labelledby="comments-heading" className="flex flex-col gap-3 border-t-4 border-flow-ink pt-4">
              <div className="flex items-center justify-between gap-3">
                <h4 id="comments-heading" className="font-display text-base font-black uppercase">
                  Comments ({selected.comments.length})
                </h4>
                <button
                  type="button"
                  onClick={() => startRefresh(() => router.refresh())}
                  className="cursor-pointer rounded-lg border-2 border-flow-ink px-3 py-1 text-xs font-black uppercase hover:bg-flow-yellow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink"
                >
                  Refresh
                </button>
              </div>
              {selected.comments.length === 0 ? (
                <p className="text-sm text-zinc-700">No comments yet. Be the first to share feedback.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {selected.comments.map((c) => (
                    <li key={c.id} className={`rounded-xl border-2 border-flow-ink p-3 ${ROLE_COLOR[c.author_role]}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <p>
                          <strong className="text-sm">{c.author_name}</strong>{" "}
                          <span className="rounded-full border-2 border-flow-ink bg-white px-2 py-0.5 font-black uppercase">
                            {ROLE_LABEL[c.author_role]}
                          </span>
                        </p>
                        <span suppressHydrationWarning className="text-zinc-700">
                          {new Date(c.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-line break-words text-sm">{c.body}</p>
                      {c.attachments.length > 0 && env ? (
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {c.attachments.map((a) => (
                            <li key={a.path}>
                              <a
                                href={publicFileUrl(env.url, a.path)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block max-w-full truncate rounded-lg border-2 border-flow-ink bg-white px-2 py-1 text-xs font-medium text-flow-blue hover:underline"
                              >
                                📎 {a.name} ({formatSize(a.size)})
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {deleteAction ? (
                        <button
                          type="button"
                          onClick={() => startRefresh(async () => { await deleteAction(c.id); router.refresh(); })}
                          className="mt-2 cursor-pointer text-xs font-bold text-flow-red underline"
                        >
                          Delete comment
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-col gap-2 pt-1">
                <label htmlFor="comment-body" className="text-sm font-medium">
                  Add a comment as {viewer.name} ({ROLE_LABEL[viewer.role]})
                </label>
                <textarea
                  id="comment-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  className="rounded-lg border-2 border-flow-ink px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-flow-ink"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer rounded-lg border-2 border-flow-ink bg-white px-3 py-1.5 text-xs font-black uppercase hover:bg-flow-yellow focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-flow-ink">
                    📎 Attach files
                    <input
                      ref={fileRef}
                      id="comment-files"
                      type="file"
                      multiple
                      accept={ACCEPT_ATTRIBUTE}
                      onChange={(e) => pickFiles(e.target.files)}
                      className="sr-only"
                    />
                  </label>
                  <span className="text-xs text-zinc-700">
                    Up to {MAX_FILES} files, 5 MB each: images, PDF, Word, Excel, PowerPoint, text.
                  </span>
                </div>
                {files.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {files.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-lg border-2 border-flow-ink bg-white px-2 py-1 text-xs">
                        <span className="max-w-48 truncate">{f.name}</span>
                        <span className="text-zinc-700">{formatSize(f.size)}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${f.name}`}
                          onClick={() => setFiles(files.filter((_, j) => j !== i))}
                          className="cursor-pointer font-black"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {error ? (
                  <p role="alert" className="text-sm font-medium text-flow-red">
                    {error}
                  </p>
                ) : null}
                <div>
                  <button
                    type="button"
                    onClick={send}
                    disabled={busy}
                    className="rounded-lg border-2 border-flow-ink bg-flow-yellow px-4 py-2 text-sm font-black uppercase shadow-[3px_3px_0_0_#0d0d0d] hover:bg-flow-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? "Posting…" : "Post comment"}
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
