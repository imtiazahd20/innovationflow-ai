"use server";

import { redirect } from "next/navigation";
import { generateJson, type GeminiError } from "@/lib/ai/gemini";
import { isChallengeId } from "@/lib/challenges/ids";
import { formatDate } from "@/lib/format";
import { AI_PLAN_SCHEMA, AI_SYSTEM_PROMPT, buildPlanPrompt, normalizeAiPlan } from "@/lib/plan/ai-draft";
import type { PlanInput } from "@/lib/plan/schema";
import { NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/validation/challenge";

export type AiDraftResult = { ok: true; plan: PlanInput; note?: string } | { ok: false; error: string };

const ERRORS: Record<GeminiError, string> = {
  "not-configured": "AI drafting isn't switched on yet. Use \"Draft from template\" for now.",
  quota: "The free AI allowance is used up for now. Try again in a minute, or use \"Draft from template\".",
  blocked: "The AI couldn't write a draft for this challenge. Try rewording it, or use \"Draft from template\".",
  "bad-response": "The AI sent back something we couldn't use. Please try again.",
  unavailable: "The AI service didn't respond. Please try again in a moment.",
};

const PART_NAMES = { brief: "brief", criteria: "judging criteria", phases: "timeline" } as const;

// Asks Gemini to write the brief, criteria and timeline for one of the signed-in person's
// own challenges. Nothing is saved here: the draft goes into the editor to be checked first.
export async function draftPlanWithAi(id: string): Promise<AiDraftResult> {
  if (!isChallengeId(id)) return { ok: false, error: "This challenge no longer exists." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: NOT_CONFIGURED_MESSAGE };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  // Only the owner may use the AI on a challenge (judges and visitors can read some
  // challenges, so we check the owner explicitly as well as relying on the database rules).
  const { data: challenge, error } = await supabase
    .from("challenges")
    .select("title, business_problem, objectives, target_participants, deadline")
    .eq("id", id)
    .eq("owner_id", userData.user.id)
    .maybeSingle();
  if (error) {
    console.error("ai draft load failed", error.code);
    return { ok: false, error: "We couldn't load this challenge. Please try again." };
  }
  if (!challenge) return { ok: false, error: "This challenge no longer exists, or it isn't yours." };

  const today = todayISO();
  const result = await generateJson({
    system: AI_SYSTEM_PROMPT,
    prompt: buildPlanPrompt(challenge, today, formatDate(challenge.deadline)),
    schema: AI_PLAN_SCHEMA as unknown as Record<string, unknown>,
  });
  if (!result.ok) return { ok: false, error: ERRORS[result.error] };

  const { plan, fromTemplate } = normalizeAiPlan(result.data, challenge, today, formatDate);
  if (fromTemplate.length === 3) return { ok: false, error: ERRORS["bad-response"] };

  const note =
    fromTemplate.length > 0
      ? `The AI's ${fromTemplate.map((p) => PART_NAMES[p]).join(" and ")} didn't come through, so ${
          fromTemplate.length === 1 ? "that part uses" : "those parts use"
        } the template instead.`
      : undefined;
  return { ok: true, plan, note };
}
