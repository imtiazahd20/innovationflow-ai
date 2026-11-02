import Link from "next/link";
import { RocketArt } from "@/components/illustrations";

export default function ChallengeNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <div className="flex flex-col items-start gap-4 rounded-2xl border-4 border-flow-ink bg-white p-8 shadow-[6px_6px_0_0_#0d0d0d]">
        <RocketArt className="h-24 w-24" />
        <h1 className="font-display text-2xl font-black uppercase text-flow-ink">Challenge not found</h1>
        <p className="text-zinc-800">
          It may have been deleted, or the address is wrong. Challenges you didn&apos;t create
          aren&apos;t visible to you.
        </p>
        <Link
          href="/dashboard"
          className="rounded-lg border-2 border-flow-ink bg-flow-yellow px-4 py-2 text-sm font-black uppercase text-flow-ink shadow-[3px_3px_0_0_#0d0d0d] transition-colors hover:bg-flow-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink"
        >
          Back to your dashboard
        </Link>
      </div>
    </main>
  );
}
