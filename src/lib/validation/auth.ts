// Checks what a person typed into the sign-in and sign-up forms, before we send it anywhere.
// The server runs this check (never trust only the browser), and the messages are written
// for the person filling in the form.

export const MIN_PASSWORD_LENGTH = 8;
// Supabase accepts passwords up to 72 characters.
export const MAX_PASSWORD_LENGTH = 72;
const MAX_EMAIL_LENGTH = 254;

export type AuthMode = "signin" | "signup";

export type FieldErrors = { email?: string; password?: string };

export type ValidationResult =
  | { ok: true; value: { email: string; password: string } }
  | { ok: false; errors: FieldErrors };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function validateCredentials(
  input: { email?: unknown; password?: unknown },
  mode: AuthMode,
): ValidationResult {
  const email = asText(input.email).trim().toLowerCase();
  const password = asText(input.password);
  const errors: FieldErrors = {};

  if (!email) {
    errors.email = "Enter your email address.";
  } else if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address, like name@company.com.";
  }

  if (!password) {
    errors.password = "Enter your password.";
  } else if (mode === "signup" && password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  } else if (password.length > MAX_PASSWORD_LENGTH) {
    errors.password = `Use no more than ${MAX_PASSWORD_LENGTH} characters.`;
  }

  if (errors.email || errors.password) return { ok: false, errors };
  return { ok: true, value: { email, password } };
}
