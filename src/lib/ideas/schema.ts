// The rules for a submitted idea. The limits match the CHECK rules in
// supabase/migrations/20261103000000_ideas.sql, so the database never has to say no first.

import { z } from "zod";

export const IDEA_LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 254 },
  title: { min: 3, max: 200 },
  description: { min: 20, max: 5000 },
} as const;

export type IdeaField = "name" | "email" | "title" | "description";
export type IdeaFieldErrors = Partial<Record<IdeaField, string>>;

// What an idea form gets back after a try. "values" lets the form keep what was typed.
export type IdeaFormState = {
  done?: boolean;
  error?: string;
  fieldErrors?: IdeaFieldErrors;
  values?: Partial<Record<IdeaField, string>>;
};

const ideaSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .min(IDEA_LIMITS.name.min, `Your name needs at least ${IDEA_LIMITS.name.min} characters.`)
    .max(IDEA_LIMITS.name.max, `Your name can be at most ${IDEA_LIMITS.name.max} characters.`),
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .max(IDEA_LIMITS.email.max, "That email address is too long.")
    .pipe(z.email("Enter a valid email address.")),
  title: z
    .string()
    .trim()
    .min(1, "Give your idea a title.")
    .min(IDEA_LIMITS.title.min, `The title needs at least ${IDEA_LIMITS.title.min} characters.`)
    .max(IDEA_LIMITS.title.max, `The title can be at most ${IDEA_LIMITS.title.max} characters.`),
  description: z
    .string()
    .trim()
    .min(1, "Describe your idea.")
    .min(
      IDEA_LIMITS.description.min,
      `Please write at least ${IDEA_LIMITS.description.min} characters so the judges can understand it.`,
    )
    .max(
      IDEA_LIMITS.description.max,
      `The description can be at most ${IDEA_LIMITS.description.max} characters.`,
    ),
});

export type IdeaInput = z.infer<typeof ideaSchema>;

export type IdeaResult =
  | { ok: true; value: IdeaInput }
  | { ok: false; errors: IdeaFieldErrors };

const FIELDS: IdeaField[] = ["name", "email", "title", "description"];

export function parseIdeaForm(form: { get(name: string): unknown }): IdeaResult {
  const raw: Record<string, unknown> = {};
  for (const field of FIELDS) {
    const value = form.get(field);
    raw[field] = typeof value === "string" ? value : "";
  }
  const parsed = ideaSchema.safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };

  const errors: IdeaFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as IdeaField | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { ok: false, errors };
}

// Turns the status word from the database function into something to show the visitor.
// Returns null for "ok" (success needs no message).
export function submitStatusMessage(status: unknown): string | null {
  switch (status) {
    case "ok":
      return null;
    case "closed":
      return "Submissions for this challenge have closed.";
    case "not_found":
      return "This challenge isn't accepting ideas. It may have been taken offline.";
    case "full":
      return "This challenge has reached its limit of ideas.";
    case "duplicate":
      return "You've already sent an idea with this title. Change the title if it's a different idea.";
    default:
      return "We couldn't send your idea. Please try again in a moment.";
  }
}

// True once the deadline day has passed. Dates are plain "YYYY-MM-DD" text, so comparing
// them as text works. The deadline day itself still accepts ideas.
export function isClosed(deadline: string, today: string): boolean {
  return today > deadline;
}
