"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { createChallenge, type ChallengeFormState } from "./actions";
import { LIMITS } from "@/lib/validation/challenge";

const initialState: ChallengeFormState = {};

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700 aria-[invalid=true]:border-red-600";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save challenge"}
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
      <label htmlFor={id} className="text-sm font-medium text-zinc-800">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-zinc-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function ChallengeForm({ minDate }: { minDate: string }) {
  const [state, action] = useActionState(createChallenge, initialState);
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};
  const describedBy = (id: string, error?: string, hint?: string) =>
    error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  const titleHint = `A short, clear name (${LIMITS.title.min}–${LIMITS.title.max} characters).`;
  const problemHint = "What is going wrong or missing today, and why does it matter?";
  const objectivesHint = "What should a good solution achieve?";
  const participantsHint = "Who should take part? For example, a team, a department or customers.";

  return (
    <form action={action} noValidate className="flex flex-col gap-6">
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
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {state.error}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-4">
        <SubmitButton />
        <Link href="/dashboard" className="text-sm font-medium text-zinc-700 underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
