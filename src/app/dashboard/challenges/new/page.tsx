import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { canManageChallenges } from "@/lib/orgs/roles";
import { prepareWorkspaces } from "@/lib/orgs/server";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/validation/challenge";
import { createChallenge } from "./actions";
import { ChallengeForm } from "./challenge-form";

export const metadata = { title: `New challenge · ${APP_NAME}` };

export default function NewChallengePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <Link href="/dashboard" className="text-sm font-medium text-flow-blue hover:underline">
          ← Your challenges
        </Link>
        <h1 className="font-display text-3xl font-black uppercase tracking-tight text-flow-ink">New challenge</h1>
        <p className="text-zinc-800">
          Describe the problem. Once it&apos;s saved, you can draft the brief, judging criteria and
          timeline from what you write here.
        </p>
      </header>

      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl border-2 border-flow-ink bg-flow-yellow" aria-hidden />}>
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
      <p className="rounded-xl border-2 border-flow-ink bg-flow-yellow p-5 text-flow-ink">
        The database connection hasn&apos;t been set up yet, so challenges can&apos;t be saved.
      </p>
    );
  }
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");

  const workspaces = ((await prepareWorkspaces(supabase, data.user.id)) ?? []).filter((w) =>
    canManageChallenges(w.roles),
  );
  if (workspaces.length === 0) {
    return (
      <p className="rounded-xl border-2 border-flow-ink bg-flow-yellow p-5 text-flow-ink">
        Only admins and organisers can create challenges, and you aren&apos;t one in any workspace yet.
        Ask a workspace admin to make you an organiser.
      </p>
    );
  }

  return (
    <ChallengeForm
      action={createChallenge}
      minDate={todayISO()}
      workspaces={workspaces.map((w) => ({ id: w.id, name: w.name }))}
    />
  );
}
