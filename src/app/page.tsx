import { Suspense } from "react";
import Link from "next/link";
import { APP_NAME, MODULES } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import {
  BulbArt,
  GearsArt,
  RocketArt,
  Sticker,
  TeamArt,
  TrendArt,
} from "@/components/illustrations";

// The whole page is static (fast). Only the big buttons wait to learn who is signed in.

const WHY = [
  {
    title: "A clear problem beats a vague wish",
    text: "Writing the problem and the goals down means everyone aims at the same target instead of guessing.",
    bg: "bg-flow-yellow",
  },
  {
    title: "Good ideas hide in unexpected places",
    text: "An open challenge invites people from every team, not just the usual voices.",
    bg: "bg-flow-pink",
  },
  {
    title: "A deadline turns talk into action",
    text: "A fixed timeline gives ideas a reason to become real proposals.",
    bg: "bg-flow-orange",
  },
  {
    title: "Fair judging builds trust",
    text: "When criteria and weights are shared up front, people know how ideas will be judged, so more of them take part.",
    bg: "bg-flow-cream",
  },
];

const IMPACT = [
  { title: "Less admin, more ideas", text: "Start from a ready-made brief, criteria and timeline instead of a blank page.", art: <GearsArt className="h-20 w-20" />, live: true },
  { title: "Fairer decisions", text: "Weighted judging criteria that everyone can see before the first idea arrives.", art: <TrendArt className="h-20 w-20" />, live: true },
  { title: "More people join in", text: "A clear brief makes it easy to understand the problem and take part.", art: <TeamArt className="h-20 w-20" />, live: true },
  { title: "Ideas that don't stall", text: "Follow winning ideas from selection through delivery so they don't fade away.", art: <RocketArt className="h-20 w-20" />, live: false },
];

const STEPS = [
  { n: "1", title: "Describe the challenge", text: "Say what problem needs solving, who should help and by when.", live: true },
  { n: "2", title: "Shape the plan", text: "Draft the brief, judging criteria and timeline, then make them yours.", live: true },
  { n: "3", title: "Judge the ideas", text: "Support participants and give judges consistent, explainable scoring.", live: false },
  { n: "4", title: "Track the impact", text: "See which ideas get built and what they achieve.", live: false },
];

const MODULE_STYLES = [
  { tab: "bg-flow-yellow text-flow-ink", card: "bg-flow-yellow/30" },
  { tab: "bg-flow-blue text-white", card: "bg-flow-blue/10" },
  { tab: "bg-flow-red text-white", card: "bg-flow-red/10" },
];

const card = "border-4 border-flow-ink shadow-[6px_6px_0_0_#0d0d0d]";

export default function Home() {
  return (
    <main className="flex-1 bg-flow-cream text-flow-ink">
      {/* ---------------------------------------------------------------- Hero */}
      <section
        className="relative overflow-hidden border-b-4 border-flow-ink bg-flow-orange"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(0,0,0,0.12) 0 14px, transparent 14px 44px)",
        }}
      >
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div className="flex flex-col gap-6">
            <div className={`${card} -rotate-1 rounded-2xl bg-flow-cream p-6 sm:p-9`}>
              <p className="text-sm font-bold tracking-wide text-zinc-600">Innovation, organised</p>
              <h1 className="mt-2 font-display text-4xl font-black uppercase leading-[0.98] tracking-tight sm:text-6xl">
                Turn big problems into <span className="text-flow-orange">winning ideas</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-7 text-zinc-800">
                {APP_NAME} helps teams run innovation challenges from the first brief to the final result. Set the
                problem, shape the plan, find the best ideas and see them through.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Suspense fallback={<BigButton href="/login" label="Sign in or create an account" />}>
                  <AccountButton />
                </Suspense>
                <a href="#why" className="text-sm font-bold underline decoration-2 underline-offset-4">
                  Why challenges matter ↓
                </a>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pl-2">
              <Sticker id="st1" text="★ IDEAS NEED A PROCESS ★ " bg="#1537c8" ring="#ffc700" className="sticker h-28 w-28 -rotate-6" />
              <Sticker id="st2" text="★ EVERY VOICE COUNTS ★ " bg="#e8001d" ring="#ffc700" className="sticker h-28 w-28 rotate-3" />
              <Sticker id="st3" text="★ FROM IDEA TO IMPACT ★ " bg="#ff4fa3" ring="#f6f2ea" className="sticker h-28 w-28 -rotate-3" />
            </div>
          </div>

          <IdeaBoard />
        </div>
      </section>

      {/* ------------------------------------------------------ What it is */}
      <section aria-labelledby="what-heading" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-sm font-black uppercase tracking-widest text-flow-red">The platform</p>
        <h2 id="what-heading" className="mt-1 font-display text-3xl font-black uppercase tracking-tight sm:text-5xl">
          Three tools, one flow
        </h2>
        <p className="mt-3 max-w-2xl text-lg text-zinc-800">
          Each tool hands over to the next, so a challenge never gets lost between a good idea and a real result.
        </p>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {MODULES.map((module, index) => (
            <li key={module.id} className="flex flex-col">
              <span className={`${MODULE_STYLES[index].tab} w-fit rounded-t-xl border-4 border-b-0 border-flow-ink px-4 py-1.5 text-sm font-black uppercase`}>
                Tool {index + 1}
              </span>
              <div className={`${card} ${MODULE_STYLES[index].card} flex flex-1 flex-col gap-3 rounded-b-2xl rounded-tr-2xl bg-white p-5`}>
                <h3 className="font-display text-xl font-black uppercase leading-tight">{module.name}</h3>
                <p className="leading-6 text-zinc-800">{module.description}</p>
                <span
                  className={`mt-auto w-fit rounded-full border-2 border-flow-ink px-3 py-1 text-xs font-black uppercase ${
                    module.status === "in-progress" ? "bg-flow-yellow" : "bg-white"
                  }`}
                >
                  {module.status === "in-progress" ? "Live now" : "Coming next"}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------- Why it matters */}
      <section id="why" aria-labelledby="why-heading" className="scroll-mt-20 border-y-4 border-flow-ink bg-flow-blue text-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-flow-yellow">Why challenges matter</p>
              <h2 id="why-heading" className="mt-1 max-w-2xl font-display text-3xl font-black uppercase tracking-tight sm:text-5xl">
                Great ideas need a great question
              </h2>
            </div>
            <BulbArt className="h-24 w-24 sm:h-32 sm:w-32" />
          </div>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2">
            {WHY.map((item) => (
              <li key={item.title} className={`${card} ${item.bg} rounded-2xl p-6 text-flow-ink`}>
                <h3 className="font-display text-xl font-black uppercase leading-tight">{item.title}</h3>
                <p className="mt-2 leading-6">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------- Impact */}
      <section aria-labelledby="impact-heading" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-sm font-black uppercase tracking-widest text-flow-red">The positive impact</p>
        <h2 id="impact-heading" className="mt-1 max-w-3xl font-display text-3xl font-black uppercase tracking-tight sm:text-5xl">
          What {APP_NAME} is built to change
        </h2>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2">
          {IMPACT.map((item) => (
            <li key={item.title} className={`${card} flex items-start gap-4 rounded-2xl bg-white p-5`}>
              <div className="shrink-0">{item.art}</div>
              <div>
                <h3 className="font-display text-lg font-black uppercase leading-tight">{item.title}</h3>
                <p className="mt-1 leading-6 text-zinc-800">{item.text}</p>
                <span
                  className={`mt-3 inline-block rounded-full border-2 border-flow-ink px-3 py-0.5 text-xs font-black uppercase ${
                    item.live ? "bg-flow-yellow" : "bg-flow-pink"
                  }`}
                >
                  {item.live ? "Available now" : "Coming next"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------------------------------------------- How it works */}
      <section aria-labelledby="how-heading" className="border-y-4 border-flow-ink bg-flow-yellow">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <h2 id="how-heading" className="font-display text-3xl font-black uppercase tracking-tight sm:text-5xl">
            How it works
          </h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <li key={step.n} className={`${card} flex flex-col gap-2 rounded-2xl bg-white p-5`}>
                <span className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-flow-ink bg-flow-red font-display text-xl font-black text-white">
                  {step.n}
                </span>
                <h3 className="font-display text-lg font-black uppercase leading-tight">{step.title}</h3>
                <p className="leading-6 text-zinc-800">{step.text}</p>
                <span className="mt-auto w-fit pt-2 text-xs font-black uppercase text-flow-red">
                  {step.live ? "● Live now" : "○ Coming next"}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------- CTA */}
      <section aria-labelledby="cta-heading" className="bg-flow-red text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6">
          <h2 id="cta-heading" className="max-w-3xl font-display text-3xl font-black uppercase tracking-tight sm:text-5xl">
            Got a problem worth solving? Start your first challenge.
          </h2>
          <Suspense fallback={<BigButton href="/login" label="Sign in or create an account" />}>
            <AccountButton />
          </Suspense>
        </div>
      </section>

      <footer className="border-t-4 border-flow-ink bg-flow-ink px-4 py-6 text-center text-sm text-zinc-300">
        {APP_NAME} · built for the Inument Hackathon ·{" "}
        <Link href="/" className="font-bold text-flow-yellow underline">
          Home
        </Link>
      </footer>
    </main>
  );
}

// A decorative "idea board": coloured tabs on top of a board holding three illustrations.
function IdeaBoard() {
  const tab = "rounded-t-xl border-4 border-b-0 border-flow-ink px-4 py-1.5 text-xs font-black uppercase sm:text-sm";
  return (
    <div className="mx-auto w-full max-w-md rotate-2 lg:max-w-none" aria-hidden="true">
      <div className="flex gap-2 pl-4">
        <span className={`${tab} bg-flow-yellow`}>Challenge</span>
        <span className={`${tab} bg-flow-blue text-white`}>Plan</span>
        <span className={`${tab} bg-flow-red text-white`}>Impact</span>
      </div>
      <div className={`${card} grid grid-cols-2 gap-4 rounded-2xl rounded-tl-none bg-flow-cream p-5 sm:p-7`}>
        <div className="flex items-center justify-center rounded-xl border-4 border-flow-ink bg-flow-pink p-3">
          <BulbArt className="h-28 w-28 sm:h-36 sm:w-36" />
        </div>
        <div className="flex items-center justify-center rounded-xl border-4 border-flow-ink bg-flow-blue p-3">
          <RocketArt className="h-28 w-28 sm:h-36 sm:w-36" />
        </div>
        <div className="flex items-center justify-center rounded-xl border-4 border-flow-ink bg-flow-yellow p-3">
          <GearsArt className="h-28 w-28 sm:h-36 sm:w-36" />
        </div>
        <div className="flex items-center justify-center rounded-xl border-4 border-flow-ink bg-flow-red p-3">
          <TeamArt className="h-28 w-28 sm:h-36 sm:w-36" />
        </div>
      </div>
    </div>
  );
}

async function AccountButton() {
  const supabase = await createClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  return data.user ? (
    <BigButton href="/dashboard" label="Go to your dashboard" />
  ) : (
    <BigButton href="/login" label="Sign in or create an account" />
  );
}

function BigButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-block rounded-xl border-4 border-flow-ink bg-flow-yellow px-6 py-3 font-display text-sm font-black uppercase text-flow-ink shadow-[5px_5px_0_0_#0d0d0d] transition-transform hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#0d0d0d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-flow-ink"
    >
      {label}
    </Link>
  );
}
