import Link from "next/link";

type Tab = "overview" | "edit" | "discuss" | "judging";

// The row of links shown at the top of every challenge page, so you can hop between them.
// Judges (who don't own the challenge) don't get the Edit tab.
export function ChallengeTabs({ id, current, canEdit }: { id: string; current: Tab; canEdit: boolean }) {
  const tabs: { key: Tab; label: string; href: string }[] = [
    { key: "overview", label: "Overview", href: `/dashboard/challenges/${id}` },
    ...(canEdit ? [{ key: "edit" as const, label: "Edit", href: `/dashboard/challenges/${id}/edit` }] : []),
    { key: "discuss", label: "Discussion", href: `/dashboard/challenges/${id}/discuss` },
    { key: "judging", label: "Judging & ranking", href: `/dashboard/challenges/${id}/judging` },
  ];
  return (
    <nav aria-label="Challenge sections" className="flex flex-wrap gap-2">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === current ? "page" : undefined}
          className={`rounded-lg border-2 border-flow-ink px-4 py-2 text-sm font-black uppercase text-flow-ink transition-colors hover:bg-flow-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink ${
            t.key === current ? "bg-flow-yellow shadow-[3px_3px_0_0_#0d0d0d]" : "bg-white"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
