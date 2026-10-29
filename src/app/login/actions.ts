"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { friendlyAuthError } from "@/lib/auth/messages";
import { createClient } from "@/lib/supabase/server";
import { NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/env";
import {
  validateCredentials,
  type FieldErrors,
} from "@/lib/validation/auth";

// What the form gets back after a try. The form shows whichever parts are set.
export type AuthFormState = {
  error?: string;
  notice?: string;
  fieldErrors?: FieldErrors;
  email?: string;
};

function emailFrom(formData: FormData): string {
  const value = formData.get("email");
  return typeof value === "string" ? value : "";
}

export async function signIn(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = validateCredentials(
    { email: formData.get("email"), password: formData.get("password") },
    "signin",
  );
  if (!parsed.ok) return { fieldErrors: parsed.errors, email: emailFrom(formData) };

  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_MESSAGE, email: parsed.value.email };

  const { error } = await supabase.auth.signInWithPassword(parsed.value);
  if (error) return { error: friendlyAuthError(error), email: parsed.value.email };

  // redirect() works by throwing, so it must stay outside any try/catch.
  redirect("/dashboard");
}

export async function signUp(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = validateCredentials(
    { email: formData.get("email"), password: formData.get("password") },
    "signup",
  );
  if (!parsed.ok) return { fieldErrors: parsed.errors, email: emailFrom(formData) };

  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_MESSAGE, email: parsed.value.email };

  // The confirmation email links back to this site. Supabase only allows addresses that
  // are on its "Redirect URLs" list, so a made-up host can't be used to steal a login.
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https");

  const { data, error } = await supabase.auth.signUp({
    ...parsed.value,
    options: { emailRedirectTo: `${protocol}://${host}/auth/callback` },
  });
  if (error) return { error: friendlyAuthError(error), email: parsed.value.email };

  // If email confirmation is switched off in Supabase, the person is already signed in.
  if (data.session) redirect("/dashboard");

  // Same message whether or not the email was already registered, so this form can't be
  // used to find out who has an account.
  return {
    notice:
      "Check your email to finish creating your account. If you already have an account, sign in instead.",
    email: parsed.value.email,
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}
