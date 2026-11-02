import { z } from "zod";

// What the public share page is allowed to show. The database function returns JSON; we check
// its shape here instead of trusting it, so a surprise in the data can't break the page.
const publicChallengeSchema = z.object({
  id: z.string(),
  title: z.string(),
  business_problem: z.string(),
  objectives: z.string(),
  target_participants: z.string(),
  deadline: z.string(),
  brief: z.string().nullable(),
  criteria: z.array(
    z.object({ name: z.string(), description: z.string().nullable(), weight: z.number() }),
  ),
  phases: z.array(
    z.object({
      name: z.string(),
      description: z.string().nullable(),
      starts_on: z.string(),
      ends_on: z.string(),
    }),
  ),
});

export type PublicChallenge = z.infer<typeof publicChallengeSchema>;

// Returns the challenge, or null when the data is missing or not the expected shape.
export function parsePublicChallenge(value: unknown): PublicChallenge | null {
  const result = publicChallengeSchema.safeParse(value);
  return result.success ? result.data : null;
}

// A challenge can only be published once it has a brief people can read.
export function publishBlocker(brief: string | null | undefined): string | null {
  return brief && brief.trim() !== "" ? null : "Write the brief first (Create plan), then publish.";
}

export function sharePath(id: string): string {
  return `/c/${id}`;
}
