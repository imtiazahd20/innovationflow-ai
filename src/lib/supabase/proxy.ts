import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { redirectTargetFor } from "@/lib/auth/routes";
import { getSupabaseEnv } from "./env";

// Runs on every page request (via src/proxy.ts). It does two jobs:
//  1. Keeps the visitor's login fresh. Login tokens expire, and only code that runs before
//     the page can safely write the renewed cookie back to the browser.
//  2. Sends people to the right place: logged-out visitors can't open the dashboard, and
//     logged-in users skip the login page.
export async function updateSession(request: NextRequest) {
  const env = getSupabaseEnv();
  // Not configured yet: let public pages work. Protected pages show their own notice.
  if (!env) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  // getClaims() checks the login token's signature, so a forged cookie is rejected.
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);

  const target = redirectTargetFor(request.nextUrl.pathname, isLoggedIn);
  if (target) {
    const redirect = NextResponse.redirect(new URL(target, request.url));
    // Carry over any renewed login cookies onto the redirect.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}
