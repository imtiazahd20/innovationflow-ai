import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { formatDate } from "@/lib/format";
import {
  CHANGELOG,
  ROADMAP,
  STATUS_LABELS,
  deferredItems,
  overallProgress,
  phaseProgress,
  type Progress,
  type RoadmapStatus,
} from "@/lib/roadmap";

export const metadata: Metadata = {
  title: `Roadmap · ${APP_NAME}`,
  description: "What has been built, what is next, and what is waiting on a paid service.",
};

const card = "border-4 border-flow-ink shadow-[6px_6px_0_0_#0d0d0d]";

// Colours chosen so the text on each badge stays easy to read.
const STATUS_STYLES: Record<RoadmapStatus, string> = {
  done: "bg-flow-ink text-flow-yellow",
  "in-progress": "bg-flow-orange text-flow-ink",
  next: "bg-flow-yellow text-flow-ink",
  planned: "bg-white text-flow-ink",
  deferred: "bg-flow-pink text-flow-ink",
};

const STATUS_ICONS: Record<RoadmapStatus, string> = {
  done: "✓",
  "in-progress": "◐",
  next: "→",
  planned: "○",
  deferred: "⏸",
};

function StatusBadge({ status }: { status: RoadmapStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-flow-ink px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide ${STATUS_STYLES[status]}`}
    >
      <span aria-hidden>{STATUS_ICONS[status]}</span>
      {status === "deferred" ? "Deferred" : STATUS_LABELS[status]}
    </span>
  );
}

function ProgressBar({ progress, label }: { progress: Progress; label: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        className="h-4 w-full overflow-hidden rounded-full border-2 border-flow-ink bg-white"
      >
        <div className="h-full bg-flow-red" style={{ width: `${progress.percent}%` }} />
      </div>
      <p className="text-sm font-bold text-flow-ink">
        {progress.done} of {progress.total} done · {progress.percent}%
      </p>
    </div>
  );
}

export default function RoadmapPage() {
  const overall = overallProgress();
  const deferred = deferredItems();
  const current = ROADMAP.find((p) => p.items.some((i) => i.status === "in-progress" || i.status === "next"));

  return (
    <main className="flex flex-1 flex-col">
      {/* ------------------------------------------------------------ Header */}
      <section className="border-b-4 border-flow-ink bg-flow-cream">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-flow-red">Development roadmap</p>
            <h1 className="mt-1 font-display text-4xl font-black uppercase tracking-tight text-flow-ink sm:text-6xl">
              Roadmap
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-zinc-800">
              Every phase of turning {APP_NAME} into a complete innovation and hackathon platform: what is done, what
              is next, and what is waiting on a paid service. We build only with free tools for now.
            </p>
          </div>
          <div className={`${card} flex flex-col gap-3 rounded-2xl bg-flow-yellow p-5`}>
            <p className="text-sm font-black uppercase tracking-widest text-flow-ink">Overall progress</p>
            <ProgressBar progress={overall} label="Overall roadmap progress" />
            {current && (
              <p className="text-sm text-flow-ink">
                Working on: <span className="font-bold">Phase {current.number}, {current.title}</span>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Legend */}
      <section aria-label="What the badges mean" className="mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6">
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-800">
          {(Object.keys(STATUS_LABELS) as RoadmapStatus[]).map((status) => (
            <li key={status} className="flex items-center gap-2">
              <StatusBadge status={status} />
              <span>{STATUS_LABELS[status]}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------------------ Phases */}
      <section aria-labelledby="phases-heading" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <h2 id="phases-heading" className="sr-only">
          Phases
        </h2>
        <ol className="grid items-start gap-8 lg:grid-cols-2">
          {ROADMAP.map((phase) => {
            const progress = phaseProgress(phase.items);
            return (
              <li key={phase.id} id={phase.id} className={`${card} flex scroll-mt-24 flex-col gap-4 rounded-2xl bg-white p-5`}>
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 border-flow-ink bg-flow-red font-display text-xl font-black text-white">
                    {phase.number}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-xl font-black uppercase leading-tight text-flow-ink">{phase.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-zinc-800">{phase.goal}</p>
                  </div>
                </div>
                <ProgressBar progress={progress} label={`Phase ${phase.number} progress`} />
                <ul className="flex flex-col divide-y-2 divide-flow-ink/10">
                  {phase.items.map((item) => (
                    <li key={item.id} className="flex flex-col gap-1.5 py-2.5 sm:flex-row sm:items-start sm:gap-3">
                      <StatusBadge status={item.status} />
                      <div className="min-w-0">
                        <p
                          className={`text-sm leading-6 ${
                            item.status === "done" ? "text-zinc-700" : "font-semibold text-flow-ink"
                          }`}
                        >
                          {item.title}
                        </p>
                        {item.detail && <p className="text-xs leading-5 text-zinc-700">{item.detail}</p>}
                        {item.costNote && <p className="text-xs leading-5 text-zinc-700">Needs: {item.costNote}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ---------------------------------------------------------- Deferred */}
      <section aria-labelledby="deferred-heading" className="border-y-4 border-flow-ink bg-flow-blue text-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <p className="text-sm font-black uppercase tracking-widest text-flow-yellow">Free tools only, for now</p>
          <h2 id="deferred-heading" className="mt-1 font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
            Waiting on a paid service
          </h2>
          <p className="mt-3 max-w-2xl text-white/90">
            These stay on the roadmap but are not built yet, because they need a paid plan. They don&apos;t count
            against progress.
          </p>
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {deferred.map((item) => (
              <li key={item.id} className="rounded-2xl border-4 border-flow-ink bg-white p-4 text-flow-ink">
                <p className="text-xs font-black uppercase tracking-wide text-flow-red">{item.phase}</p>
                <p className="mt-1 font-bold">{item.title}</p>
                <p className="mt-1 text-sm text-zinc-800">{item.costNote}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* --------------------------------------------------------- Changelog */}
      <section aria-labelledby="changelog-heading" className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <p className="text-sm font-black uppercase tracking-widest text-flow-red">Changelog</p>
        <h2 id="changelog-heading" className="mt-1 font-display text-3xl font-black uppercase tracking-tight text-flow-ink sm:text-4xl">
          Recently shipped
        </h2>
        <ol className="mt-8 flex flex-col gap-6">
          {CHANGELOG.map((entry) => (
            <li key={`${entry.date}-${entry.title}`} className={`${card} rounded-2xl bg-white p-5`}>
              <p className="text-sm font-black uppercase tracking-wide text-flow-red">
                <time dateTime={entry.date}>{formatDate(entry.date)}</time>
              </p>
              <h3 className="mt-1 font-display text-lg font-black uppercase text-flow-ink">{entry.title}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-zinc-800">
                {entry.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        <p className="mt-10 text-sm text-zinc-800">
          Want to try what&apos;s live?{" "}
          <Link href="/dashboard" className="font-bold text-flow-blue underline">
            Open your dashboard
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
