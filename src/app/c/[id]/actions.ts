"use server";

import { revalidatePath } from "next/cache";
import { isChallengeId } from "@/lib/challenges/ids";
import { parseIdeaForm, parseSubmitResult, submitStatusMessage, type IdeaFormState, type IdeaField } from "@/lib/ideas/schema";
import { createClient } from "@/lib/supabase/server";
import { NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/env";

const FIELDS: IdeaField[] = ["name", "email", "title", "description"];

function typedValues(formData: FormData): IdeaFormState["values"] {
  const values: Partial<Record<IdeaField, string>> = {};
  for (const field of FIELDS) {
    const value = formData.get(field);
    values[field] = typeof value === "string" ? value : "";
  }
  return values;
}

// Anyone can call this, signed in or not, so it checks everything itself:
// the shape of the data here, and whether the challenge accepts ideas in the database function.
export async function submitIdea(
  id: string,
  _previous: IdeaFormState,
  formData: FormData,
): Promise<IdeaFormState> {
  const values = typedValues(formData);

  // "website" is a hidden field real people never see or fill. Simple bots fill every field,
  // so a filled one means "not a person". We pretend it worked so the bot learns nothing.
  const trap = formData.get("website");
  if (typeof trap === "string" && trap.trim() !== "") return { done: true };

  if (!isChallengeId(id)) return { error: submitStatusMessage("not_found") ?? undefined, values };

  const parsed = parseIdeaForm(formData);
  if (!parsed.ok) return { fieldErrors: parsed.errors, values };

  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_MESSAGE, values };

  const { data, error } = await supabase.rpc("submit_idea", {
    p_challenge_id: id,
    p_name: parsed.value.name,
    p_email: parsed.value.email,
    p_title: parsed.value.title,
    p_description: parsed.value.description,
  });
  if (error) {
    console.error("submitIdea failed", error.code);
    return { error: submitStatusMessage(undefined) ?? undefined, values };
  }

  const result = parseSubmitResult(data);
  const message = submitStatusMessage(result.status);
  if (message || !result.token) return { error: message ?? submitStatusMessage(undefined) ?? undefined, values };

  revalidatePath(`/dashboard/challenges/${id}`);
  return { done: true, discussionPath: `/c/${id}/discuss/${result.token}` };
}
