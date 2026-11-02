"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isChallengeId } from "@/lib/challenges/ids";
import { parsePlan } from "@/lib/plan/schema";
import { createClient } from "@/lib/supabase/server";
import { NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/env";

export type PlanState = { errors?: string[] };

const NOT_FOUND = ["This challenge no longer exists, or it isn't yours. Go back to your dashboard."];
const SAVE_FAILED = ["We couldn't save your plan. Please try again in a moment."];

// Saves the brief, judging criteria and timeline in one go. The editor sends the whole plan
// as JSON; we check it again here because the browser can never be fully trusted.
export async function savePlan(id: string, _previous: PlanState, formData: FormData): Promise<PlanState> {
  if (!isChallengeId(id)) return { errors: NOT_FOUND };

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("plan") ?? ""));
  } catch {
    return { errors: ["Something went wrong reading the form. Reload the page and try again."] };
  }
  const parsed = parsePlan(raw);
  if (!parsed.ok) return { errors: parsed.errors };
  const plan = parsed.value;

  const supabase = await createClient();
  if (!supabase) return { errors: [NOT_CONFIGURED_MESSAGE] };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  // 1. The brief lives on the challenge row. No row back = deleted, or not yours.
  const { data: updated, error: briefError } = await supabase
    .from("challenges")
    .update({ brief: plan.brief === "" ? null : plan.brief })
    .eq("id", id)
    .select("id");
  if (briefError) {
    console.error("savePlan brief failed", briefError.code);
    return { errors: SAVE_FAILED };
  }
  if (!updated || updated.length === 0) return { errors: NOT_FOUND };

  // 2. Criteria and phases are replaced. New rows go in FIRST and the old ones are removed
  //    afterwards, so a failure part-way never leaves the challenge with nothing.
  const [oldCriteria, oldPhases] = await Promise.all([
    supabase.from("judging_criteria").select("id").eq("challenge_id", id),
    supabase.from("timeline_phases").select("id").eq("challenge_id", id),
  ]);
  if (oldCriteria.error || oldPhases.error) {
    console.error("savePlan load old failed", oldCriteria.error?.code, oldPhases.error?.code);
    return { errors: SAVE_FAILED };
  }

  if (plan.criteria.length > 0) {
    const { error } = await supabase.from("judging_criteria").insert(
      plan.criteria.map((c, position) => ({
        challenge_id: id,
        name: c.name,
        description: c.description === "" ? null : c.description,
        weight: c.weight,
        position,
      })),
    );
    if (error) {
      console.error("savePlan criteria insert failed", error.code);
      return { errors: SAVE_FAILED };
    }
  }
  if (plan.phases.length > 0) {
    const { error } = await supabase.from("timeline_phases").insert(
      plan.phases.map((p, position) => ({
        challenge_id: id,
        name: p.name,
        description: p.description === "" ? null : p.description,
        starts_on: p.starts_on,
        ends_on: p.ends_on,
        position,
      })),
    );
    if (error) {
      console.error("savePlan phases insert failed", error.code);
      return { errors: SAVE_FAILED };
    }
  }

  const oldCriteriaIds = (oldCriteria.data ?? []).map((r) => r.id);
  const oldPhaseIds = (oldPhases.data ?? []).map((r) => r.id);
  if (oldCriteriaIds.length > 0) {
    const { error } = await supabase.from("judging_criteria").delete().in("id", oldCriteriaIds);
    if (error) {
      console.error("savePlan criteria cleanup failed", error.code);
      return { errors: SAVE_FAILED };
    }
  }
  if (oldPhaseIds.length > 0) {
    const { error } = await supabase.from("timeline_phases").delete().in("id", oldPhaseIds);
    if (error) {
      console.error("savePlan phases cleanup failed", error.code);
      return { errors: SAVE_FAILED };
    }
  }

  // Without these, the browser can reuse a remembered copy of the pages and show old data.
  revalidatePath(`/dashboard/challenges/${id}`);
  revalidatePath(`/dashboard/challenges/${id}/plan`);
  redirect(`/dashboard/challenges/${id}?planned=1`);
}
