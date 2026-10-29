// Turns Supabase's technical error codes into sentences a person can act on.
// We deliberately never show the raw error text on screen.

export type AuthErrorLike = {
  code?: string;
  message?: string;
  status?: number;
} | null;

const GENERIC = "Something went wrong. Please try again in a moment.";

export function friendlyAuthError(error: AuthErrorLike): string {
  if (!error) return GENERIC;
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();

  if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
    return "That email and password don't match. Check them and try again.";
  }
  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return "Please confirm your email first. Open the link we sent you, then sign in.";
  }
  if (code === "weak_password") {
    return "That password is too easy to guess. Try a longer one with a mix of characters.";
  }
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || error.status === 429) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  if (code === "signup_disabled") {
    return "New accounts can't be created right now.";
  }
  if (code === "user_already_exists") {
    return "An account with this email already exists. Try signing in instead.";
  }
  return GENERIC;
}
