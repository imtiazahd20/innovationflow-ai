import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { BulbArt } from "./illustrations";

// Shown at the top of EVERY page (it lives in the root layout). It is a plain server
// component with no login check, so it never slows a page down. "Dashboard" sends people
// who aren't signed in to the login page automatically.
export function SiteHeader() {
  const link =
    "rounded-full border-2 border-flow-ink px-2.5 py-1 text-xs font-bold sm:px-3 sm:text-sm text-flow-ink transition-colors hover:bg-flow-ink hover:text-flow-yellow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink";
  return (
    <header className="sticky top-0 z-50 border-b-4 border-flow-ink bg-flow-yellow">
      <nav aria-label="Main" className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-1.5 font-display text-xs font-black uppercase tracking-tight text-flow-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink min-[400px]:text-sm sm:text-lg"
        >
          <BulbArt className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
          <span>{APP_NAME}</span>
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
        </ul>
      </nav>
    </header>
  );
}
