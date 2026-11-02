"use client";

import { useState, useTransition } from "react";
import type { PublishState } from "./actions";

const button =
  "rounded-lg border-2 border-flow-ink px-4 py-2 text-sm font-black uppercase text-flow-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink disabled:cursor-not-allowed disabled:opacity-60";

// Lets the owner publish a challenge, copy its share link, or take it back to draft.
export function PublishPanel({
  published,
  shareUrl,
  action,
}: {
  published: boolean;
  shareUrl: string;
  action: (publish: boolean) => Promise<PublishState>;
}) {
  const [error, setError] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function change(publish: boolean) {
    setError(undefined);
    startTransition(async () => {
      const result = await action(publish);
      if (result?.error) setError(result.error);
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy automatically. Select the link and copy it yourself.");
    }
  }

  return (
    <section
      aria-labelledby="share-heading"
      className="flex flex-col gap-3 rounded-2xl border-4 border-flow-ink bg-white p-5 shadow-[6px_6px_0_0_#0d0d0d]"
    >
      <h2 id="share-heading" className="font-display text-xl font-black uppercase text-flow-ink">
        {published ? "Published" : "Share this challenge"}
      </h2>
      {published ? (
        <>
          <p className="text-sm text-zinc-800">
            Anyone with this link can read the challenge. They can&apos;t edit it.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              readOnly
              value={shareUrl}
              aria-label="Share link"
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-lg border-2 border-flow-ink bg-white px-3 py-2 text-sm text-flow-ink"
            />
            <button type="button" onClick={copy} className={`${button} bg-flow-yellow hover:bg-flow-orange`}>
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
          <div>
            <button
              type="button"
              onClick={() => change(false)}
              disabled={pending}
              className={`${button} bg-white font-medium normal-case hover:bg-flow-yellow`}
            >
              {pending ? "Working…" : "Unpublish (back to draft)"}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-zinc-800">
            Publishing creates a read-only link you can send to participants. You can take it back to draft any time.
          </p>
          <div>
            <button
              type="button"
              onClick={() => change(true)}
              disabled={pending}
              className={`${button} bg-flow-yellow shadow-[3px_3px_0_0_#0d0d0d] hover:bg-flow-orange`}
            >
              {pending ? "Publishing…" : "Publish"}
            </button>
          </div>
        </>
      )}
      {error ? (
        <p role="alert" className="rounded-lg border-2 border-flow-ink bg-flow-red px-3 py-2 text-sm text-white">
          {error}
        </p>
      ) : null}
    </section>
  );
}
