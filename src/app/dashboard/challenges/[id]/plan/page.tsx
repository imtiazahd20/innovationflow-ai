import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { isChallengeId } from "@/lib/challenges/ids";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/validation/challenge";
import { savePlan } from "./actions";
import { draftPlanWithAi } from "./ai-actions";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { PlanEditor } from "./plan-editor";

export const metadata = { title: `Plan · ${APP_NAME}` };

type Props = { params: Promise<{ id: string }> };

export default function PlanPage({ params }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <Suspense fallback={<span className="h-5" />}>
          <BackLink params={params} />
        </Suspense>
        <h1 className="font-display text-3xl font-black uppercase tracking-tight text-flow-ink">Brief, criteria and timeline</h1>
      </header>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl border-2 border-flow-ink bg-flow-yellow" aria-hidden />}>
        <PlanLoader params={params} />
      </Suspense>
    </main>
  );
}

async function BackLink({ params }: Props) {
  const { id } = await params;
  return (
    <Link
      href={isChallengeId(id) ? `/dashboard/challenges/${id}` : "/dashboard"}
      className="text-sm font-medium text-flow-blue hover:underline"
    >
      ← Back to challenge
    </Link>
  );
}

async function PlanLoader({ params }: Props) {
  const { id } = await params;
  if (!isChallengeId(id)) notFound();

  const supabase = await createClient();
  if (!supabase) {
    return (
      <p className="rounded-xl border-2 border-flow-ink bg-flow-yellow p-5 text-flow-ink">
        The database connection hasn&apos;t been set up yet.
      </p>
    );
  }
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  const { data: challenge, error } = await supabase
    .from("challenges")
    .select("title, business_problem, objectives, target_participants, deadline, brief")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("load plan failed", error.code);
    return (
      <p role="alert" className="rounded-xl border-2 border-flow-ink bg-flow-red p-5 text-white">
        We couldn&apos;t load this challenge. Reload the page to try again.
      </p>
    );
  }
  if (!challenge) notFound();

  const [criteria, phases] = await Promise.all([
    supabase.from("judging_criteria").select("name, description, weight").eq("challenge_id", id).order("position"),
    supabase.from("timeline_phases").select("name, description, starts_on, ends_on").eq("challenge_id", id).order("position"),
  ]);
  if (criteria.error || phases.error) {
    console.error("load plan rows failed", criteria.error?.code, phases.error?.code);
    return (
      <p role="alert" className="rounded-xl border-2 border-flow-ink bg-flow-red p-5 text-white">
        We couldn&apos;t load the plan. Reload the page to try again.
      </p>
    );
  }

  const { brief, ...basics } = challenge;
  // The editor remembers what it was given when it first appeared. Next.js keeps visited pages
  // alive in the background, so without a changing "key" it would show an old, stale plan.
  const dataKey = JSON.stringify([brief, criteria.data, phases.data]);
  return (
    <PlanEditor
      key={dataKey}
      action={savePlan.bind(null, id)}
      basics={basics}
      today={todayISO()}
      cancelHref={`/dashboard/challenges/${id}`}
      aiDraft={isGeminiConfigured() ? draftPlanWithAi.bind(null, id) : undefined}
      initial={{
        brief: brief ?? "",
        criteria: (criteria.data ?? []).map((c) => ({
          name: c.name,
          description: c.description ?? "",
          weight: String(c.weight),
        })),
        phases: (phases.data ?? []).map((p) => ({
          name: p.name,
          description: p.description ?? "",
          starts_on: p.starts_on,
          ends_on: p.ends_on,
        })),
      }}
    />
  );
}
