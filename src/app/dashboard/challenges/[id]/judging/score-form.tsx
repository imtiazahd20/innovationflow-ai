"use client";

import { useActionState } from "react";
import type { Criterion } from "@/lib/judging/scoring";
import type { JudgingFormState } from "./actions";

// One score box per criterion (0 to 10). Saving again simply replaces the earlier scores.
export function ScoreForm({
  criteria,
  initial,
  action,
}: {
  criteria: Criterion[];
  initial: Record<string, number>;
  action: (previous: JudgingFormState, formData: FormData) => Promise<JudgingFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-3">
      {/* Two columns side by side (3 + 3 for six criteria); one column on narrow phones. */}
      <ul
        className="grid grid-cols-1 gap-2 sm:grid-flow-col sm:grid-cols-2 sm:[grid-template-rows:repeat(var(--rows),auto)]"
        style={{ "--rows": Math.ceil(criteria.length / 2) } as React.CSSProperties}
      >
        {criteria.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border-2 border-flow-ink bg-white px-2 py-1.5">
            <label htmlFor={`s-${c.id}`} className="min-w-0 text-xs font-medium leading-tight text-flow-ink">
              {c.name} <span className="text-zinc-700">· {c.weight}%</span>
            </label>
            <input
              id={`s-${c.id}`}
              name={`score_${c.id}`}
              type="number"
              min={0}
              max={10}
              step={1}
              inputMode="numeric"
              defaultValue={initial[c.id] ?? ""}
              placeholder="0-10"
              className="w-14 shrink-0 rounded-md border-2 border-flow-ink px-1.5 py-0.5 text-right text-flow-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink"
            />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border-2 border-flow-ink bg-flow-yellow px-4 py-2 text-sm font-black uppercase text-flow-ink shadow-[3px_3px_0_0_#0d0d0d] transition-colors hover:bg-flow-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save scores"}
        </button>
        <p className="min-w-0 flex-1 basis-48 text-xs text-zinc-700">
          0 = weakest, 10 = strongest. An idea is ranked once all criteria are scored.
        </p>
        {state.error ? (
          <p role="alert" className="text-sm font-medium text-flow-red">{state.error}</p>
        ) : state.done ? (
          <p role="status" className="text-sm font-medium text-flow-ink">Scores saved.</p>
        ) : null}
      </div>
    </form>
  );
}
