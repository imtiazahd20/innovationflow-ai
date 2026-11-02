"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isChallengeId } from "@/lib/challenges/ids";
import type { ChallengeFormState } from "@/lib/challenges/types";
import { createClient } from "@/lib/supabase/server";
import { NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/env";
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

const NOT_FOUND_MESSAGE =
  "This challenge no longer exists, or it isn't yours. Go back to your dashboard.";

// Saves changes to an existing challenge. The page passes the id in with .bind(), and the
// database's Row Level Security makes sure it can only ever touch the signed-in person's own.
export async function updateChallenge(
  id: string,
  _previous: ChallengeFormState,
  formData: FormData,
): Promise<ChallengeFormState> {
  const values = typedValues(formData);

  if (!isChallengeId(id)) return { error: NOT_FOUND_MESSAGE, values };

  // Editing keeps old deadlines allowed: a challenge whose deadline has passed can still
  // have its wording fixed. (Creating a new challenge does not allow past deadlines.)
  const parsed = parseChallengeForm(formData, "0000-01-01");
  if (!parsed.ok) return { fieldErrors: parsed.errors, values };

  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_MESSAGE, values };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const { data: updated, error } = await supabase
    .from("challenges")
    .update(parsed.value)
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("updateChallenge failed", error.code);
    return { error: "We couldn't save your changes. Please try again in a moment.", values };
  }
  // No row came back: it was deleted meanwhile, or belongs to someone else.
  if (!updated || updated.length === 0) return { error: NOT_FOUND_MESSAGE, values };

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/challenges/${id}`);
  redirect(`/dashboard/challenges/${id}?updated=1`);
}

export type DeleteState = { error?: string };

export async function deleteChallenge(id: string): Promise<DeleteState> {
  if (!isChallengeId(id)) return { error: NOT_FOUND_MESSAGE };

  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_MESSAGE };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const { data: deleted, error } = await supabase
    .from("challenges")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("deleteChallenge failed", error.code);
    return { error: "We couldn't delete this challenge. Please try again in a moment." };
  }
  if (!deleted || deleted.length === 0) return { error: NOT_FOUND_MESSAGE };

  revalidatePath("/dashboard");
  redirect("/dashboard?deleted=1");
}
