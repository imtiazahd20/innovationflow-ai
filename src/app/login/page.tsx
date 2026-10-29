import { Suspense } from "react";
import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { AuthForm } from "./auth-form";

export const metadata = { title: `Sign in · ${APP_NAME}` };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-sm font-medium text-teal-700 hover:underline">
          ← {APP_NAME}
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Welcome back
        </h1>
        <p className="text-zinc-600">
          Sign in to plan and manage your innovation challenges.
        </p>
      </header>

      {/* useSearchParams() inside AuthForm needs a Suspense boundary. */}
      <Suspense fallback={<div className="h-72 animate-pulse rounded-lg bg-zinc-100" aria-hidden />}>
        <AuthForm />
      </Suspense>
    </main>
  );
}
