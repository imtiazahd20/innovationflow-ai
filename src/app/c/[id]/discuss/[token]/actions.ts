"use server";

import { revalidatePath } from "next/cache";
import { isChallengeId } from "@/lib/challenges/ids";
import { commentStatusMessage, validateComment, validateFiles, type PostResult, type UploadedFile } from "@/lib/discussion/schema";
import { createClient } from "@/lib/supabase/server";
import { NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/env";

// A participant posts a comment using their private key. Anyone can call this, so the
// database function re-checks the key, the idea, the text and every file before saving.
export async function postParticipantComment(
  challengeId: string,
  token: string,
  ideaId: string,
  body: string,
  files: UploadedFile[],
): Promise<PostResult> {
  if (!isChallengeId(challengeId) || !isChallengeId(token) || !isChallengeId(ideaId)) {
    return { error: commentStatusMessage("forbidden") ?? undefined };
  }
  const problem = validateComment(body) ?? validateFiles(files);
  if (problem) return { error: problem };

  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_MESSAGE };

  const { data, error } = await supabase.rpc("post_comment", {
    p_challenge_id: challengeId,
    p_token: token,
    p_idea_id: ideaId,
    p_body: body,
    p_files: files,
  });
  if (error) console.error("post_comment failed", error.code);
  const message = error ? commentStatusMessage(undefined) : commentStatusMessage(data);
  if (message) return { error: message };

  revalidatePath(`/c/${challengeId}/discuss/${token}`);
  return { ok: true };
}
