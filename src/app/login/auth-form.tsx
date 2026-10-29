"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { signIn, signUp, type AuthFormState } from "./actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation/auth";

const initialState: AuthFormState = {};

// Shown on the button while the request is in flight, so people don't click twice.
function SubmitButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? busy : idle}
    </button>
  );
}

function Field({
  id,
  label,
  type,
  autoComplete,
  defaultValue,
  error,
  hint,
}: {
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  defaultValue?: string;
  error?: string;
  hint?: string;
}) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-zinc-800">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700 aria-[invalid=true]:border-red-600"
      />
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

function Messages({ state }: { state: AuthFormState }) {
  return (
    <div aria-live="polite" className="flex flex-col gap-2">
      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {state.error}
        </p>
      ) : null}
      {state.notice ? (
        <p className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
          {state.notice}
        </p>
      ) : null}
    </div>
  );
}

export function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signInState, signInAction] = useActionState(signIn, initialState);
  const [signUpState, signUpAction] = useActionState(signUp, initialState);
  const searchParams = useSearchParams();
  const confirmationFailed = searchParams.get("error") === "confirmation";

  const isSignIn = mode === "signin";
  const state = isSignIn ? signInState : signUpState;

  const tabClass = (active: boolean) =>
    `flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      active ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
    }`;

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Sign in or create an account" className="flex gap-1 rounded-lg bg-zinc-100 p-1">
        <button type="button" role="tab" aria-selected={isSignIn} onClick={() => setMode("signin")} className={tabClass(isSignIn)}>
          Sign in
        </button>
        <button type="button" role="tab" aria-selected={!isSignIn} onClick={() => setMode("signup")} className={tabClass(!isSignIn)}>
          Create account
        </button>
      </div>

      {confirmationFailed ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          That confirmation link didn&apos;t work. It may have expired. Sign in, or create your account again to get a new link.
        </p>
      ) : null}

      {/* key={mode} gives each mode its own fresh form, so errors don't carry across tabs. */}
      <form key={mode} action={isSignIn ? signInAction : signUpAction} noValidate className="flex flex-col gap-4">
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          defaultValue={state.email}
          error={state.fieldErrors?.email}
        />
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete={isSignIn ? "current-password" : "new-password"}
          error={state.fieldErrors?.password}
          hint={isSignIn ? undefined : `At least ${MIN_PASSWORD_LENGTH} characters.`}
        />
        <Messages state={state} />
        <SubmitButton
          idle={isSignIn ? "Sign in" : "Create account"}
          busy={isSignIn ? "Signing in…" : "Creating account…"}
        />
      </form>
    </div>
  );
}
