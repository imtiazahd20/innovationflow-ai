// Rules for the idea discussion: comment text, attachments, and the shape of what the
// database returns. The limits match supabase/migrations/20261105000000_discussion.sql.

import { z } from "zod";

export const COMMENT_MAX = 2000;
export const MAX_FILES = 3;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

// File type (as reported by the browser) -> the ending we store the file under.
export const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
};

export const ACCEPT_ATTRIBUTE = Object.values(ALLOWED_TYPES)
  .map((ext) => `.${ext}`)
  .join(",");

export type FileInfo = { name: string; type: string; size: number };

// Returns a message for the first problem, or null when the files are fine.
export function validateFiles(files: FileInfo[]): string | null {
  if (files.length > MAX_FILES) return `You can attach at most ${MAX_FILES} files per comment.`;
  for (const f of files) {
    if (!(f.type in ALLOWED_TYPES)) {
      return `"${f.name}" can't be attached. Allowed: images, PDF, Word, Excel, PowerPoint and text files.`;
    }
    if (f.size <= 0) return `"${f.name}" is empty.`;
    if (f.size > MAX_FILE_BYTES) return `"${f.name}" is larger than 5 MB.`;
  }
  return null;
}

export function validateComment(body: string): string | null {
  const text = body.trim();
  if (!text) return "Write a comment first.";
  if (text.length > COMMENT_MAX) return `Comments can be at most ${COMMENT_MAX} characters.`;
  return null;
}

export type UploadedFile = { path: string; name: string; type: string; size: number };

// "12 KB", "3.4 MB"
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// The address where an uploaded file can be opened.
export function publicFileUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/idea-files/${path}`;
}

// Turns the status word from post_comment into a message (null = success).
export function commentStatusMessage(status: unknown): string | null {
  switch (status) {
    case "ok":
      return null;
    case "invalid":
      return "That comment or one of its files isn't allowed.";
    case "full":
      return "This idea has reached its limit of comments.";
    case "forbidden":
      return "You can't comment here. Your link may be wrong, or the challenge was taken offline.";
    default:
      return "We couldn't post your comment. Please try again in a moment.";
  }
}

const attachmentSchema = z.object({ path: z.string(), name: z.string(), type: z.string(), size: z.number() });

const discussionSchema = z.object({
  viewer: z.object({ role: z.enum(["submitter", "judge", "owner"]), name: z.string(), idea_id: z.string().nullable() }),
  challenge: z.object({ id: z.string(), title: z.string(), status: z.string(), deadline: z.string() }),
  ideas: z.array(
    z.object({
      id: z.string(),
      submitter_name: z.string(),
      title: z.string(),
      description: z.string(),
      created_at: z.string(),
      comments: z.array(
        z.object({
          id: z.string(),
          author_role: z.enum(["submitter", "judge", "owner"]),
          author_name: z.string(),
          body: z.string(),
          attachments: z.array(attachmentSchema),
          created_at: z.string(),
        }),
      ),
    }),
  ),
});

export type Discussion = z.infer<typeof discussionSchema>;
export type DiscussionIdea = Discussion["ideas"][number];
export type DiscussionComment = DiscussionIdea["comments"][number];

export function parseDiscussion(data: unknown): Discussion | null {
  const parsed = discussionSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export type PostResult = { error?: string; ok?: boolean };
