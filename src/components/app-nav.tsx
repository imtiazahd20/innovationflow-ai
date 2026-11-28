"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAV, isActive } from "@/lib/nav";

// The module navigation under the site header on every dashboard page. On phones it scrolls
// sideways instead of wrapping, so it always stays one line tall.
export function AppNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="App" className="border-b-4 border-flow-ink bg-flow-cream">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 overflow-x-auto px-4 py-2 sm:px-6">
        {APP_NAV.map((group, gi) => (
          <div key={group.label} className="flex shrink-0 items-center gap-1.5">
            {gi > 0 ? <span aria-hidden className="mr-2 h-6 w-0.5 bg-flow-ink/20" /> : null}
            <span className="sr-only">{group.label}:</span>
            {group.items.map((item) => {
              const active = isActive(item, pathname);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  title={item.soon ? "Not built yet: see where it is on the roadmap" : undefined}
                  className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border-2 px-3 py-1.5 text-xs font-black uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink sm:text-sm ${
                    active
                      ? "border-flow-ink bg-flow-yellow text-flow-ink shadow-[3px_3px_0_0_#0d0d0d]"
                      : item.soon
                        ? "border-dashed border-flow-ink/50 text-zinc-700 hover:border-flow-ink hover:bg-white"
                        : "border-transparent text-flow-ink hover:border-flow-ink hover:bg-white"
                  }`}
                >
                  {item.label}
                  {item.soon ? (
                    <span className="rounded-full border border-flow-ink bg-flow-pink px-1.5 text-[10px] leading-4 text-flow-ink">
                      Soon
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}
