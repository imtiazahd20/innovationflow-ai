import { Suspense } from "react";
import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { AuthForm } from "./auth-form";

export const metadata = { title: `Sign in · ${APP_NAME}` };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-sm font-medium text-flow-blue hover:underline">
          ← {APP_NAME}
        </Link>
        <h1 className="font-display text-3xl font-black uppercase tracking-tight text-flow-ink">
          Welcome back
        </h1>
        <p className="text-zinc-800">
          Sign in to plan and manage your innovation challenges.
        </p>
      </header>

      {/* useSearchParams() inside AuthForm needs a Suspense boundary. */}
      <div className="rounded-2xl border-4 border-flow-ink bg-white p-6 shadow-[6px_6px_0_0_#0d0d0d]">
        <Suspense fallback={<div className="h-72 animate-pulse rounded-lg border-2 border-flow-ink bg-flow-yellow" aria-hidden />}>
          <AuthForm />
        </Suspense>
      </div>
    </main>
  );
}
