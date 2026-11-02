"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/env";
import type { ChallengeFormState } from "@/lib/challenges/types";
import { parseChallengeForm, type ChallengeField } from "@/lib/validation/challenge";

const FIELDS: ChallengeField[] = [
  "title",
  "business_problem",
  "objectives",
  "target_participants",
  "deadline",
];

function typedValues(formData: FormData): ChallengeFormState["values"] {
  const values: Partial<Record<ChallengeField, string>> = {};
  for (const field of FIELDS) {
    const value = formData.get(field);
    values[field] = typeof value === "string" ? value : "";
  }
  return values;
}

export async function createChallenge(
  _previous: ChallengeFormState,
  formData: FormData,
): Promise<ChallengeFormState> {
  const values = typedValues(formData);

  // Server-side check: never trust only the browser.
  const parsed = parseChallengeForm(formData);
  if (!parsed.ok) return { fieldErrors: parsed.errors, values };

  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_MESSAGE, values };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  // owner_id is filled in by the database from the login, so it can't be forged.
  const { error } = await supabase.from("challenges").insert(parsed.value);
  if (error) {
    console.error("createChallenge failed", error.code);
    return { error: "We couldn't save your challenge. Please try again in a moment.", values };
  }

  // Tell Next.js the dashboard list is out of date. Without this, the browser can reuse a
  // remembered copy of /dashboard?saved=1 and not show the challenge you just saved.
  revalidatePath("/dashboard");

  // redirect() works by throwing, so it must stay outside any try/catch.
  redirect("/dashboard?saved=1");
}
