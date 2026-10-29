import { Suspense } from "react";
import Link from "next/link";
import { APP_NAME, APP_TAGLINE, MODULES } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-12 px-6 py-20">
      <header className="flex flex-col gap-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-teal-700">
          Innovation management
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
          {APP_NAME}
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-zinc-600">{APP_TAGLINE}</p>
        <div>
          {/* The page itself is static. Only this button waits to learn who is signed in. */}
          <Suspense fallback={<StartLink href="/login" label="Sign in or create an account" />}>
            <AccountLink />
          </Suspense>
        </div>
      </header>

      <section aria-labelledby="modules-heading" className="flex flex-col gap-4">
        <h2 id="modules-heading" className="text-xl font-semibold text-zinc-900">
          Three connected modules
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {MODULES.map((module, index) => (
            <li
              key={module.id}
              className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-5"
            >
              <span className="text-sm font-medium text-zinc-500">
                Module {index + 1}
              </span>
              <h3 className="text-base font-semibold text-zinc-900">
                {module.name}
              </h3>
              <p className="text-sm leading-6 text-zinc-600">
                {module.description}
              </p>
              <span
                className={
                  module.status === "in-progress"
                    ? "mt-auto w-fit rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800"
                    : "mt-auto w-fit rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600"
                }
              >
                {module.status === "in-progress" ? "Building now" : "Planned"}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

async function AccountLink() {
  const supabase = await createClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  return data.user ? (
    <StartLink href="/dashboard" label="Go to your dashboard" />
  ) : (
    <StartLink href="/login" label="Sign in or create an account" />
  );
}

function StartLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-block rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
    >
      {label}
    </Link>
  );
}
