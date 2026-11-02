import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { isChallengeId } from "@/lib/challenges/ids";
import { createClient } from "@/lib/supabase/server";
import { ChallengeForm } from "../../new/challenge-form";
import { updateChallenge } from "../actions";

export const metadata = { title: `Edit challenge · ${APP_NAME}` };

type Props = { params: Promise<{ id: string }> };

export default function EditChallengePage({ params }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <Suspense fallback={<span className="h-5" />}>
          <BackLink params={params} />
        </Suspense>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Edit challenge</h1>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-zinc-100" aria-hidden />}>
        <EditForm params={params} />
      </Suspense>
    </main>
  );
}

async function BackLink({ params }: Props) {
  const { id } = await params;
  return (
    <Link
      href={isChallengeId(id) ? `/dashboard/challenges/${id}` : "/dashboard"}
      className="text-sm font-medium text-teal-700 hover:underline"
    >
      ← Back to challenge
    </Link>
  );
}

async function EditForm({ params }: Props) {
  const { id } = await params;
  if (!isChallengeId(id)) notFound();

  const supabase = await createClient();
  if (!supabase) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
        The database connection hasn&apos;t been set up yet.
      </p>
    );
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const { data, error } = await supabase
    .from("challenges")
    .select("title, business_problem, objectives, target_participants, deadline")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("load challenge for edit failed", error.code);
    return (
      <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
        We couldn&apos;t load this challenge. Reload the page to try again.
      </p>
    );
  }
  if (!data) notFound();

  return (
    <ChallengeForm
      key={JSON.stringify(data)} // fresh form whenever the saved data changes (see plan page)
      action={updateChallenge.bind(null, id)}
      initialValues={data}
      submitLabel="Save changes"
      busyLabel="Saving…"
      cancelHref={`/dashboard/challenges/${id}`}
    />
  );
}
