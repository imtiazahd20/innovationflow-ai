import { Suspense } from "react";
import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";
import { APP_NAME } from "@/lib/config";
import { BulbArt } from "./illustrations";

const pill =
  "rounded-full border-2 border-flow-ink px-2.5 py-1 text-xs font-bold sm:px-3 sm:text-sm text-flow-ink transition-colors hover:bg-flow-ink hover:text-flow-yellow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink";

// The ONE place to sign in or out: a link when signed out, a button when signed in.
async function AccountControl() {
  const supabase = await createClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!data.user) {
    return (
      <Link href="/login" className={`${pill} bg-white`}>
        Sign in
      </Link>
    );
  }
  return (
    <form action={signOut}>
      <button type="submit" className={`${pill} bg-white`}>
        Sign out
      </button>
    </form>
  );
}

// Shown at the top of EVERY page (it lives in the root layout). The sign in/out button does
// its login check inside its own Suspense, so it never holds up the page. "Dashboard" sends
// people who aren't signed in to the login page automatically.
export function SiteHeader() {
  const link =
    "rounded-full border-2 border-flow-ink px-2.5 py-1 text-xs font-bold sm:px-3 sm:text-sm text-flow-ink transition-colors hover:bg-flow-ink hover:text-flow-yellow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink";
  return (
    <header className="sticky top-0 z-50 border-b-4 border-flow-ink bg-flow-yellow">
      <nav aria-label="Main" className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <Link
          href="/"
          aria-label={APP_NAME}
          className="flex min-w-0 items-center gap-1.5 font-display text-xs font-black uppercase tracking-tight text-flow-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink min-[400px]:text-sm sm:text-lg"
        >
          <BulbArt className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
          {/* On very narrow phones only the bulb shows, so the three buttons fit. */}
          <span className="hidden min-[480px]:inline">{APP_NAME}</span>
        </Link>
        <ul className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <li>
            <Link href="/" className={link}>
              Home
            </Link>
          </li>
          <li>
            <Link href="/dashboard" className={`${link} bg-flow-ink text-flow-yellow hover:bg-flow-red hover:text-white`}>
              Dashboard
            </Link>
          </li>
          <li>
            {/* Waits for the login check without holding up the rest of the page. */}
            <Suspense fallback={<span className={`${pill} invisible inline-block`}>Sign in</span>}>
              <AccountControl />
            </Suspense>
          </li>
        </ul>
      </nav>
    </header>
  );
}
