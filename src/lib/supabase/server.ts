import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getSupabaseEnv } from "./env";

// Creates a Supabase connection for server code (pages, server actions, route handlers).
//
// It reads the visitor's login cookie, so every request is made "as" that person and the
// database's Row Level Security rules apply to them. Always create a fresh one per request;
// never store it in a variable that outlives the request.
//
// Returns null when Supabase isn't configured yet.
export async function createClient() {
  const env = getSupabaseEnv();
  if (!env) return null;

  // Wait for a real request before building the client. The Supabase client reads the clock
  // (Date.now) while loading the session, which Next.js forbids during prerendering.
  await connection();
  const cookieStore = await cookies();

  return createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components can't write cookies. That's fine: src/proxy.ts refreshes the
          // login cookie on every request, so nothing is lost.
        }
      },
    },
  });
}
