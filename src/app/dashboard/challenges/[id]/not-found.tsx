import Link from "next/link";

export default function ChallengeNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold text-zinc-900">Challenge not found</h1>
      <p className="text-zinc-600">
        It may have been deleted, or the address is wrong. Challenges you didn&apos;t create
        aren&apos;t visible to you.
      </p>
      <Link href="/dashboard" className="text-sm font-medium text-teal-700 underline">
        Back to your dashboard
      </Link>
    </main>
  );
}
