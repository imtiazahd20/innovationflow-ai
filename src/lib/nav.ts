// The app navigation shown on every dashboard page, grouped by the product's modules.
// Items that aren't built yet are marked "soon" and link to their place on the roadmap,
// never to an empty page.

export type NavItem = {
  label: string;
  href: string;
  // Which paths count as "this section" for highlighting. Defaults to href.
  match?: string[];
  soon?: boolean;
};

export type NavGroup = { label: string; items: NavItem[] };

export const APP_NAV: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", href: "/dashboard", match: ["/dashboard", "/dashboard/challenges"] },
      { label: "Members & roles", href: "/dashboard/workspace", match: ["/dashboard/workspace", "/dashboard/organizations"] },
      { label: "Notifications", href: "/dashboard/notifications" },
    ],
  },
  {
    label: "Modules",
    items: [
      { label: "Sprint Planner", href: "/dashboard", match: [] },
      { label: "AI Judge", href: "/roadmap#ai-judge", soon: true },
      { label: "Impact Tracker", href: "/roadmap#impact", soon: true },
    ],
  },
  {
    label: "Progress",
    items: [{ label: "Roadmap", href: "/roadmap" }],
  },
];

// True when this item should be highlighted for the current path. The dashboard home only
// matches exactly, so it isn't lit up on every page below it.
export function isActive(item: NavItem, pathname: string): boolean {
  const prefixes = item.match ?? [item.href];
  return prefixes.some((p) =>
    p === "/dashboard" ? pathname === "/dashboard" : pathname === p || pathname.startsWith(`${p}/`),
  );
}
