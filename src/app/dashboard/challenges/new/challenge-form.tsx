"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import type { ChallengeFormAction, ChallengeFormState } from "@/lib/challenges/types";
import { LIMITS, type ChallengeField } from "@/lib/validation/challenge";

const inputClass =
  "rounded-lg border-2 border-flow-ink bg-white px-3 py-2.5 text-sm text-flow-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-flow-ink aria-[invalid=true]:border-flow-red";

function SubmitButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border-2 border-flow-ink bg-flow-yellow shadow-[3px_3px_0_0_#0d0d0d] px-5 py-2.5 text-sm font-black uppercase text-flow-ink transition-colors hover:bg-flow-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? busy : idle}
    </button>
  );
}

function FieldShell({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-flow-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-zinc-700">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

// One form for both creating and editing a challenge. The page decides what happens on
// submit by passing in "action", and what the fields start with via "initialValues".
export function ChallengeForm({
  action: submitAction,
  initialValues,
  minDate,
  submitLabel = "Save challenge",
  busyLabel = "Saving…",
  cancelHref = "/dashboard",
  workspaces,
}: {
  action: ChallengeFormAction;
  initialValues?: Partial<Record<ChallengeField, string>>;
  minDate?: string;
  submitLabel?: string;
  busyLabel?: string;
  cancelHref?: string;
  // Only on the "new challenge" form: the workspaces this person may create challenges in.
  workspaces?: { id: string; name: string }[];
}) {
  const initialState: ChallengeFormState = { values: initialValues };
  const [state, action] = useActionState(submitAction, initialState);
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};
  const describedBy = (id: string, error?: string, hint?: string) =>
    error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  const titleHint = `A short, clear name (${LIMITS.title.min}–${LIMITS.title.max} characters).`;
  const problemHint = "What is going wrong or missing today, and why does it matter?";
  const objectivesHint = "What should a good solution achieve?";
  const participantsHint = "Who should take part? For example, a team, a department or customers.";

  return (
    <form action={action} noValidate className="flex flex-col gap-6 rounded-2xl border-4 border-flow-ink bg-white p-6 shadow-[6px_6px_0_0_#0d0d0d]">
      {workspaces && workspaces.length > 1 ? (
        <FieldShell
          id="organization_id"
          label="Workspace"
          hint="Everyone who is an admin or organiser in this workspace can manage the challenge."
        >
          <select
            id="organization_id"
            name="organization_id"
            defaultValue={state.organizationId ?? workspaces[0].id}
            aria-describedby="organization_id-hint"
            className={inputClass}
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </FieldShell>
      ) : workspaces && workspaces.length === 1 ? (
        <input type="hidden" name="organization_id" value={workspaces[0].id} />
      ) : null}
      <FieldShell id="title" label="Challenge title" hint={titleHint} error={errors.title}>
        <input
          id="title"
          name="title"
          type="text"
          defaultValue={values.title}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={describedBy("title", errors.title, titleHint)}
          className={inputClass}
        />
      </FieldShell>

      <FieldShell
        id="business_problem"
        label="Business problem"
        hint={problemHint}
        error={errors.business_problem}
      >
        <textarea
          id="business_problem"
          name="business_problem"
          rows={5}
          defaultValue={values.business_problem}
          aria-invalid={errors.business_problem ? true : undefined}
          aria-describedby={describedBy("business_problem", errors.business_problem, problemHint)}
          className={inputClass}
        />
      </FieldShell>

      <FieldShell id="objectives" label="Objectives" hint={objectivesHint} error={errors.objectives}>
        <textarea
          id="objectives"
          name="objectives"
          rows={4}
          defaultValue={values.objectives}
          aria-invalid={errors.objectives ? true : undefined}
          aria-describedby={describedBy("objectives", errors.objectives, objectivesHint)}
          className={inputClass}
        />
      </FieldShell>

      <FieldShell
        id="target_participants"
        label="Target participants"
        hint={participantsHint}
        error={errors.target_participants}
      >
        <input
          id="target_participants"
          name="target_participants"
          type="text"
          defaultValue={values.target_participants}
          aria-invalid={errors.target_participants ? true : undefined}
          aria-describedby={describedBy("target_participants", errors.target_participants, participantsHint)}
          className={inputClass}
        />
      </FieldShell>

      <FieldShell id="deadline" label="Deadline" error={errors.deadline}>
        <input
          id="deadline"
          name="deadline"
          type="date"
          min={minDate}
          defaultValue={values.deadline}
          aria-invalid={errors.deadline ? true : undefined}
          aria-describedby={describedBy("deadline", errors.deadline)}
          className={`${inputClass} max-w-xs`}
        />
      </FieldShell>

      <div aria-live="polite">
        {state.error ? (
          <p role="alert" className="rounded-lg border-2 border-flow-ink bg-flow-red px-3 py-2 text-sm text-white">
            {state.error}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-4">
        <SubmitButton idle={submitLabel} busy={busyLabel} />
        <Link href={cancelHref} className="text-sm font-medium text-flow-ink underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
