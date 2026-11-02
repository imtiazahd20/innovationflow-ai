"use client";

import { useState, useTransition } from "react";
import type { DeleteState } from "./actions";

// Deleting can't be undone, so the first click only asks "are you sure?".
export function DeleteButton({ action }: { action: () => Promise<DeleteState> }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    setError(undefined);
    startTransition(async () => {
      // On success the action redirects to the dashboard, so we only get here on a problem.
      const result = await action();
      if (result?.error) setError(result.error);
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
      >
        Delete
      </button>
    );
  }

  return (
    <div role="alertdialog" aria-label="Confirm delete" className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-medium text-red-900">
        Delete this challenge for good? This can&apos;t be undone.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={confirmDelete}
          disabled={pending}
          className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Yes, delete it"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
        >
          Keep it
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
