"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isChallengeId } from "@/lib/challenges/ids";
import { parseJudgeEmail, parseJudging, parseScoreForm } from "@/lib/judging/scoring";
import { createClient } from "@/lib/supabase/server";
import { NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/env";

export type JudgingFormState = { error?: string; done?: boolean };

const GENERIC = "Something went wrong. Please try again in a moment.";

async function signedIn() {
  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_MESSAGE } as const;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase } as const;
}

// The owner invites a judge by email. The judge then signs in with that email address.
// Row Level Security only lets the challenge's owner insert here.
export async function addJudge(
  challengeId: string,
  _previous: JudgingFormState,
  formData: FormData,
): Promise<JudgingFormState> {
  if (!isChallengeId(challengeId)) return { error: GENERIC };
  const parsed = parseJudgeEmail(formData.get("email"));
  if (!parsed.ok) return { error: parsed.error };

  const session = await signedIn();
  if ("error" in session) return { error: session.error };

  const { error } = await session.supabase
    .from("challenge_judges")
    .insert({ challenge_id: challengeId, email: parsed.email });
  if (error) {
    if (error.code === "23505") return { error: "That person is already a judge." };
    console.error("addJudge failed", error.code);
    return { error: GENERIC };
  }
  revalidatePath(`/dashboard/challenges/${challengeId}/judging`);
  return { done: true };
}

export async function removeJudge(challengeId: string, judgeRowId: string): Promise<void> {
  if (!isChallengeId(challengeId) || !isChallengeId(judgeRowId)) return;
  const session = await signedIn();
  if ("error" in session) return;
  const { error } = await session.supabase
    .from("challenge_judges")
    .delete()
    .eq("id", judgeRowId)
    .eq("challenge_id", challengeId);
  if (error) console.error("removeJudge failed", error.code);
  revalidatePath(`/dashboard/challenges/${challengeId}/judging`);
}

// Saves the signed-in judge's (or owner's) scores for one idea.
export async function saveIdeaScores(
  challengeId: string,
  ideaId: string,
  _previous: JudgingFormState,
  formData: FormData,
): Promise<JudgingFormState> {
  if (!isChallengeId(challengeId) || !isChallengeId(ideaId)) return { error: GENERIC };

  const session = await signedIn();
  if ("error" in session) return { error: session.error };

  // Ask the database which criteria exist (it also checks that this person may judge).
  const { data, error: loadError } = await session.supabase.rpc("get_judging", { p_challenge_id: challengeId });
  const judging = parseJudging(data);
  if (loadError || !judging) return { error: "You can't score ideas for this challenge." };

  const parsed = parseScoreForm(formData, judging.criteria);
  if (!parsed.ok) return { error: parsed.error };

  const { data: status, error } = await session.supabase.rpc("save_scores", {
    p_idea_id: ideaId,
    p_scores: parsed.scores,
  });
  if (error || status !== "ok") {
    if (error) console.error("save_scores failed", error.code);
    return { error: status === "forbidden" ? "You can't score this idea." : GENERIC };
  }
  revalidatePath(`/dashboard/challenges/${challengeId}/judging`);
  return { done: true };
}
