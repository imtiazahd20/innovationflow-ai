"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
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

// How often (in milliseconds) an open thread checks for new comments.
const POLL_MS = 8000;
// Shared by every thread on the page, so several threads never refresh the page at the same moment.
let lastPoll = 0;

export const ROLE_LABEL = { submitter: "Participant", judge: "Judge", owner: "Organiser" } as const;
const ROLE_COLOR = { submitter: "bg-white", judge: "bg-flow-pink", owner: "bg-flow-yellow" } as const;

type Props = {
  idea: Discussion["ideas"][number];
  viewer: Discussion["viewer"];
  // The folder uploads go into: "t/<private key>" for participants, "c/<challenge id>" for staff.
  uploadFolder: string;
  postAction: (ideaId: string, body: string, files: UploadedFile[]) => Promise<PostResult>;
  deleteAction?: (commentId: string) => Promise<void>;
  // Makes the field ids unique when several threads are on one page (the judging list).
  uid?: string;
};

// The comments of one idea, plus the form to add a comment with attachments.
// Used inside the idea pop-up and inside each idea on the judging page.
export function CommentThread({ idea, viewer, uploadFolder, postAction, deleteAction, uid }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [busy, startTransition] = useTransition();
  const [, startRefresh] = useTransition();
  const env = getSupabaseEnv();
  const sectionRef = useRef<HTMLElement>(null);

  // "Live" comments: while this thread is on screen and the browser tab is in front, ask the
  // server for fresh data every few seconds. router.refresh() re-reads the page's data but keeps
  // what you are typing and which idea is open.
  useEffect(() => {
    const timer = setInterval(() => {
      const el = sectionRef.current;
      const onScreen = el !== null && el.offsetParent !== null; // false inside a closed dropdown
      if (document.hidden || !onScreen || busy) return;
      if (Date.now() - lastPoll < POLL_MS / 2) return;
      lastPoll = Date.now();
      startRefresh(() => router.refresh());
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [busy, router]);

  const bodyId = uid ? `comment-body-${uid}` : "comment-body";
  const filesId = uid ? `comment-files-${uid}` : "comment-files";

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
      const result = await postAction(idea.id, body, uploaded);
      if (result.error) return setError(result.error);
      setBody("");
      setFiles([]);
      router.refresh();
    });
  }

  return (
      <section ref={sectionRef} aria-labelledby={`comments-heading-${idea.id}`} className="flex flex-col gap-3 border-t-4 border-flow-ink pt-4">
        <div className="flex items-center justify-between gap-3">
          <h4 id={`comments-heading-${idea.id}`} className="font-display text-base font-black uppercase">
            Comments ({idea.comments.length}){" "}
            <span className="ml-1 text-[10px] font-bold normal-case tracking-normal text-zinc-600">updates automatically</span>
          </h4>
          <button
            type="button"
            onClick={() => startRefresh(() => router.refresh())}
            className="cursor-pointer rounded-lg border-2 border-flow-ink px-3 py-1 text-xs font-black uppercase hover:bg-flow-yellow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink"
          >
            Refresh now
          </button>
        </div>
        {idea.comments.length === 0 ? (
          <p className="text-sm text-zinc-700">No comments yet. Be the first to share feedback.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {idea.comments.map((c) => (
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
          <label htmlFor={bodyId} className="text-sm font-medium">
            Add a comment as {viewer.name} ({ROLE_LABEL[viewer.role]})
          </label>
          <textarea
            id={bodyId}
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
                id={filesId}
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
  );
}
