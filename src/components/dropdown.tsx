// A closed-by-default section: only the title shows until the visitor clicks it.
// <details> is built into browsers, so it works without any JavaScript and with the keyboard.
export function Dropdown({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-2xl border-4 border-flow-ink bg-white shadow-[4px_4px_0_0_#0d0d0d]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 font-display text-lg font-black uppercase text-flow-ink hover:bg-flow-yellow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink group-open:rounded-b-none group-open:bg-flow-yellow [&::-webkit-details-marker]:hidden">
        {title}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-6 w-6 shrink-0 transition-transform group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 9l7 7 7-7" />
        </svg>
      </summary>
      <div className="border-t-4 border-flow-ink p-5">{children}</div>
    </details>
  );
}
