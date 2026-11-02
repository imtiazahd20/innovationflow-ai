"use client";

import { useActionState } from "react";
import type { JudgeInvite } from "@/lib/judging/scoring";
import type { JudgingFormState } from "./actions";

// Owner only: invite judges by email and remove them again.
export function JudgesPanel({
  judges,
  addAction,
  removeAction,
}: {
  judges: JudgeInvite[];
  addAction: (previous: JudgingFormState, formData: FormData) => Promise<JudgingFormState>;
  removeAction: (judgeRowId: string) => Promise<void>;
}) {
  const [state, formAction, pending] = useActionState(addAction, {});
  return (
    <section aria-labelledby="judges-heading" className="flex flex-col gap-4 rounded-2xl border-4 border-flow-ink bg-white p-5 shadow-[4px_4px_0_0_#0d0d0d]">
      <h2 id="judges-heading" className="font-display text-xl font-black uppercase text-flow-ink">
        Judges ({judges.length})
      </h2>
      <p className="text-sm text-zinc-800">
        Invite people by email. They sign in (or sign up) with that same address and will find the challenge on their
        dashboard. You can score ideas too.
      </p>
      {judges.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {judges.map((j) => (
            <li key={j.id} className="flex items-center justify-between gap-3 rounded-lg border-2 border-flow-ink p-3">
              <span className="min-w-0 truncate text-sm text-flow-ink">{j.email}</span>
              <form action={removeAction.bind(null, j.id)}>
                <button
                  type="submit"
                  aria-label={`Remove ${j.email}`}
                  className="rounded-lg border-2 border-flow-ink px-3 py-1 text-xs font-black uppercase text-flow-ink hover:bg-flow-red hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink"
                >
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
      <form action={formAction} className="flex flex-col gap-2">
        <label htmlFor="judge-email" className="text-sm font-medium text-flow-ink">Judge&apos;s email</label>
        <div className="flex flex-wrap gap-2">
          <input
            id="judge-email"
            name="email"
            type="email"
            autoComplete="off"
            required
            key={judges.length}
            className="min-w-0 flex-1 rounded-lg border-2 border-flow-ink px-3 py-2 text-flow-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg border-2 border-flow-ink bg-flow-yellow px-4 py-2 text-sm font-black uppercase text-flow-ink shadow-[3px_3px_0_0_#0d0d0d] hover:bg-flow-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink disabled:opacity-60"
          >
            {pending ? "Adding…" : "Add judge"}
          </button>
        </div>
        {state.error ? <p role="alert" className="text-sm font-medium text-flow-red">{state.error}</p> : null}
      </form>
    </section>
  );
}
