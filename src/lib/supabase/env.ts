// Reads the two Supabase settings from the environment.
//
// Both values are meant to be public: the URL is the address of your project and the
// "publishable" key only identifies the project. What each person can actually see or
// change is decided by the database's Row Level Security rules, not by hiding this key.
// (The secret "service_role" key must NEVER be used here or put in a NEXT_PUBLIC_ variable.)

export type SupabaseEnv = { url: string; key: string };

// Returns null when the settings are missing, so the site can show a friendly setup
// message instead of crashing.
export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export const NOT_CONFIGURED_MESSAGE =
  "Sign-in isn't available yet because the database connection hasn't been set up.";
