"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { IDEA_LIMITS, type IdeaFormState } from "@/lib/ideas/schema";

const inputClass =
  "rounded-lg border-2 border-flow-ink bg-white px-3 py-2.5 text-sm text-flow-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-flow-ink aria-[invalid=true]:border-flow-red";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border-2 border-flow-ink bg-flow-yellow px-5 py-2.5 text-sm font-black uppercase text-flow-ink shadow-[3px_3px_0_0_#0d0d0d] transition-colors hover:bg-flow-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Sending…" : "Send my idea"}
    </button>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
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

// The public "share your idea" form. The page passes the action in (already tied to this
// challenge's id), so this component only deals with what the visitor sees.
export function IdeaForm({
  action: submitAction,
}: {
  action: (previous: IdeaFormState, formData: FormData) => Promise<IdeaFormState>;
}) {
  const [state, action] = useActionState(submitAction, {} as IdeaFormState);
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};

  if (state.done) {
    return (
      <div role="status" className="rounded-xl border-2 border-flow-ink bg-flow-yellow p-5 text-flow-ink">
        <p className="font-display text-lg font-black uppercase">Thank you!</p>
        <p className="mt-1 text-sm">Your idea was sent to the organisers. Good luck!</p>
      </div>
    );
  }

  const describe = (id: keyof typeof errors, hint?: string) =>
    errors[id] ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {/* Trap for simple bots: hidden from people and from screen readers, and left empty. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Your name" error={errors.name}>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            maxLength={IDEA_LIMITS.name.max}
            defaultValue={values.name}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={describe("name")}
            className={inputClass}
          />
        </Field>
        <Field
          id="email"
          label="Your email"
          error={errors.email}
          hint="Only the organisers will see this."
        >
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={IDEA_LIMITS.email.max}
            defaultValue={values.email}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={describe("email", "x")}
            className={inputClass}
          />
        </Field>
      </div>

      <Field id="title" label="Idea title" error={errors.title}>
        <input
          id="title"
          name="title"
          type="text"
          maxLength={IDEA_LIMITS.title.max}
          defaultValue={values.title}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={describe("title")}
          className={inputClass}
        />
      </Field>

      <Field
        id="description"
        label="Describe your idea"
        error={errors.description}
        hint="What is it, how does it solve the problem, and how could it work in practice?"
      >
        <textarea
          id="description"
          name="description"
          rows={6}
          maxLength={IDEA_LIMITS.description.max}
          defaultValue={values.description}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={describe("description", "x")}
          className={inputClass}
        />
      </Field>

      <div aria-live="polite">
        {state.error ? (
          <p role="alert" className="rounded-lg border-2 border-flow-ink bg-flow-red px-3 py-2 text-sm text-white">
            {state.error}
          </p>
        ) : null}
      </div>

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
