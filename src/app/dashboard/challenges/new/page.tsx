import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/validation/challenge";
import { createChallenge } from "./actions";
import { ChallengeForm } from "./challenge-form";

export const metadata = { title: `New challenge · ${APP_NAME}` };

export default function NewChallengePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <Link href="/dashboard" className="text-sm font-medium text-teal-700 hover:underline">
          ← Your challenges
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">New challenge</h1>
        <p className="text-zinc-600">
          Describe the problem. In a later step, AI will draft the brief, judging criteria and
          timeline from what you write here.
        </p>
      </header>

      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-zinc-100" aria-hidden />}>
        <FormGate />
      </Suspense>
    </main>
  );
}

// Checks the visitor is signed in before showing the form. Reading the login cookie needs a
// real request, which is why this sits behind <Suspense>.
async function FormGate() {
  const supabase = await createClient();
  if (!supabase) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
        The database connection hasn&apos;t been set up yet, so challenges can&apos;t be saved.
      </p>
    );
  }
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");

  return <ChallengeForm action={createChallenge} minDate={todayISO()} />;
}
