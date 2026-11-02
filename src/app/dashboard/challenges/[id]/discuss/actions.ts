"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isChallengeId } from "@/lib/challenges/ids";
import { commentStatusMessage, validateComment, validateFiles, type PostResult, type UploadedFile } from "@/lib/discussion/schema";
import { createClient } from "@/lib/supabase/server";
import { NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/env";

// The owner or an invited judge posts a comment. The database decides who is allowed.
export async function postStaffComment(
  challengeId: string,
  ideaId: string,
  body: string,
  files: UploadedFile[],
): Promise<PostResult> {
  if (!isChallengeId(challengeId) || !isChallengeId(ideaId)) return { error: commentStatusMessage("forbidden") ?? undefined };
  const problem = validateComment(body) ?? validateFiles(files);
  if (problem) return { error: problem };

  const supabase = await createClient();
  if (!supabase) return { error: NOT_CONFIGURED_MESSAGE };
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const { data, error } = await supabase.rpc("post_comment", {
    p_challenge_id: challengeId,
    p_token: null,
    p_idea_id: ideaId,
    p_body: body,
    p_files: files,
  });
  if (error) console.error("post_comment failed", error.code);
  const message = error ? commentStatusMessage(undefined) : commentStatusMessage(data);
  if (message) return { error: message };

  revalidatePath(`/dashboard/challenges/${challengeId}/discuss`);
  return { ok: true };
}

// Only the owner can remove comments (the database checks).
export async function deleteComment(challengeId: string, commentId: string): Promise<void> {
  if (!isChallengeId(challengeId) || !isChallengeId(commentId)) return;
  const supabase = await createClient();
  if (!supabase) return;
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");
  const { error } = await supabase.rpc("delete_comment", { p_comment_id: commentId });
  if (error) console.error("delete_comment failed", error.code);
  revalidatePath(`/dashboard/challenges/${challengeId}/discuss`);
}
