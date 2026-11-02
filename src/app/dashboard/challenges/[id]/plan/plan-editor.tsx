"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { draftPlan, type ChallengeBasics } from "@/lib/plan/draft";
import { PLAN_LIMITS, totalWeight } from "@/lib/plan/schema";
import { formatDate } from "@/lib/format";
import type { PlanState } from "./actions";

// While typing, every value is text. The weight is turned into a number when saving.
type CriterionRow = { name: string; description: string; weight: string };
type PhaseRow = { name: string; description: string; starts_on: string; ends_on: string };

export type InitialPlan = { brief: string; criteria: CriterionRow[]; phases: PhaseRow[] };

const inputClass =
  "rounded-lg border-2 border-flow-ink bg-white px-3 py-2 text-sm text-flow-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-flow-ink";
const smallButton =
  "rounded-lg border-2 border-flow-ink bg-white px-3 py-1.5 text-sm font-medium text-flow-ink hover:bg-flow-yellow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border-2 border-flow-ink bg-flow-yellow shadow-[3px_3px_0_0_#0d0d0d] px-5 py-2.5 text-sm font-black uppercase text-flow-ink transition-colors hover:bg-flow-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save plan"}
    </button>
  );
}

export function PlanEditor({
  action: saveAction,
  initial,
  basics,
  today,
  cancelHref,
}: {
  action: (previous: PlanState, formData: FormData) => Promise<PlanState>;
  initial: InitialPlan;
  basics: ChallengeBasics;
  today: string;
  cancelHref: string;
}) {
  const [state, action] = useActionState(saveAction, {} as PlanState);
  const [brief, setBrief] = useState(initial.brief);
  const [criteria, setCriteria] = useState<CriterionRow[]>(initial.criteria);
  const [phases, setPhases] = useState<PhaseRow[]>(initial.phases);

  const hasContent = brief.trim() !== "" || criteria.length > 0 || phases.length > 0;
  const total = totalWeight(criteria.map((c) => ({ weight: c.weight.trim() === "" ? NaN : Number(c.weight) })));

  function fillDraft() {
    if (hasContent && !window.confirm("Replace what is on this page with a fresh draft?")) return;
    const draft = draftPlan(basics, today, formatDate);
    setBrief(draft.brief);
    setCriteria(draft.criteria.map((c) => ({ ...c, weight: String(c.weight) })));
    setPhases(draft.phases);
  }

  const payload = JSON.stringify({
    brief,
    criteria: criteria.map((c) => ({
      ...c,
      weight: c.weight.trim() === "" ? null : Number(c.weight),
    })),
    phases,
  });

  const update = <T,>(list: T[], index: number, patch: Partial<T>) =>
    list.map((item, i) => (i === index ? { ...item, ...patch } : item));

  return (
    <form action={action} className="flex flex-col gap-10">
      <input type="hidden" name="plan" value={payload} />

      <section className="flex flex-col gap-3 rounded-xl border-2 border-flow-ink bg-flow-yellow p-5">
        <h2 className="text-base font-bold text-flow-ink">Start with a draft</h2>
        <p className="text-sm text-flow-ink">
          Fills the brief, criteria and timeline from your challenge details. It uses simple
          templates (no AI), so read it through and change anything you like before saving.
        </p>
        <div>
          <button type="button" onClick={fillDraft} className={smallButton}>
            Draft for me
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <label htmlFor="brief" className="font-display text-lg font-black uppercase text-flow-ink">
          Challenge brief
        </label>
        <p className="text-sm text-zinc-700">What participants will read. Plain text; blank lines separate paragraphs.</p>
        <textarea
          id="brief"
          rows={14}
          maxLength={PLAN_LIMITS.brief}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          className={inputClass}
        />
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="criteria-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="criteria-heading" className="font-display text-lg font-black uppercase text-flow-ink">
            Judging criteria
          </h2>
          <p role="status" className={`text-sm font-medium ${criteria.length === 0 || total === 100 ? "text-zinc-800" : "text-red-700"}`}>
            {criteria.length === 0 ? "No criteria yet" : `Weights add up to ${total} of 100`}
          </p>
        </div>
        {criteria.map((c, i) => (
          <fieldset key={i} className="flex flex-col gap-3 rounded-xl border-2 border-flow-ink bg-white p-4">
            <legend className="px-1 text-sm font-medium text-zinc-700">Criterion {i + 1}</legend>
            <div className="flex flex-wrap gap-3">
              <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm font-medium text-flow-ink">
                Name
                <input
                  className={inputClass}
                  value={c.name}
                  maxLength={PLAN_LIMITS.name}
                  onChange={(e) => setCriteria(update(criteria, i, { name: e.target.value }))}
                />
              </label>
              <label className="flex w-28 flex-col gap-1 text-sm font-medium text-flow-ink">
                Weight (%)
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  max={100}
                  inputMode="numeric"
                  value={c.weight}
                  onChange={(e) => setCriteria(update(criteria, i, { weight: e.target.value }))}
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm font-medium text-flow-ink">
              Description (optional)
              <textarea
                className={inputClass}
                rows={2}
                maxLength={PLAN_LIMITS.description}
                value={c.description}
                onChange={(e) => setCriteria(update(criteria, i, { description: e.target.value }))}
              />
            </label>
            <div>
              <button type="button" className={smallButton} onClick={() => setCriteria(criteria.filter((_, n) => n !== i))}>
                Remove criterion {i + 1}
              </button>
            </div>
          </fieldset>
        ))}
        <div>
          <button
            type="button"
            className={smallButton}
            disabled={criteria.length >= PLAN_LIMITS.maxCriteria}
            onClick={() => setCriteria([...criteria, { name: "", description: "", weight: "0" }])}
          >
            Add criterion
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="timeline-heading">
        <h2 id="timeline-heading" className="font-display text-lg font-black uppercase text-flow-ink">
          Timeline
        </h2>
        {phases.map((p, i) => (
          <fieldset key={i} className="flex flex-col gap-3 rounded-xl border-2 border-flow-ink bg-white p-4">
            <legend className="px-1 text-sm font-medium text-zinc-700">Phase {i + 1}</legend>
            <label className="flex flex-col gap-1 text-sm font-medium text-flow-ink">
              Name
              <input
                className={inputClass}
                value={p.name}
                maxLength={PLAN_LIMITS.name}
                onChange={(e) => setPhases(update(phases, i, { name: e.target.value }))}
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1 text-sm font-medium text-flow-ink">
                Starts
                <input
                  className={inputClass}
                  type="date"
                  value={p.starts_on}
                  onChange={(e) => setPhases(update(phases, i, { starts_on: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-flow-ink">
                Ends
                <input
                  className={inputClass}
                  type="date"
                  value={p.ends_on}
                  onChange={(e) => setPhases(update(phases, i, { ends_on: e.target.value }))}
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm font-medium text-flow-ink">
              Description (optional)
              <textarea
                className={inputClass}
                rows={2}
                maxLength={PLAN_LIMITS.description}
                value={p.description}
                onChange={(e) => setPhases(update(phases, i, { description: e.target.value }))}
              />
            </label>
            <div>
              <button type="button" className={smallButton} onClick={() => setPhases(phases.filter((_, n) => n !== i))}>
                Remove phase {i + 1}
              </button>
            </div>
          </fieldset>
        ))}
        <div>
          <button
            type="button"
            className={smallButton}
            disabled={phases.length >= PLAN_LIMITS.maxPhases}
            onClick={() =>
              setPhases([...phases, { name: "", description: "", starts_on: basics.deadline, ends_on: basics.deadline }])
            }
          >
            Add phase
          </button>
        </div>
      </section>

      <div aria-live="polite">
        {state.errors && state.errors.length > 0 ? (
          <div role="alert" className="rounded-lg border-2 border-flow-ink bg-flow-red px-4 py-3 text-sm text-white">
            <p className="font-medium">Please fix this before saving:</p>
            <ul className="mt-1 list-disc pl-5">
              {state.errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-4">
        <SaveButton />
        <Link href={cancelHref} className="text-sm font-medium text-flow-ink underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
