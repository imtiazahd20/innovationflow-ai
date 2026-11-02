import { z } from "zod";

// Challenge ids are UUIDs. Checking the shape first means a mistyped address like
// /dashboard/challenges/abc shows "not found" instead of sending nonsense to the database.
export function isChallengeId(value: unknown): value is string {
  return z.uuid().safeParse(value).success;
}
