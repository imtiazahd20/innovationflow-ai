// The numbers at the top of the dashboard, worked out from rows the signed-in person is
// allowed to see. Kept free of database code so it can be tested.

export type OverviewChallenge = { id: string; title: string; status: string; deadline: string };

export type Overview = {
  total: number;
  published: number;
  drafts: number;
  ideas: number;
  ideasByChallenge: Map<string, number>;
  // The next deadline that hasn't passed yet among published challenges, if any.
  nextDeadline: { id: string; title: string; deadline: string; daysLeft: number } | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Whole days from today to an ISO date (YYYY-MM-DD). Today is 0; yesterday is -1.
export function daysUntil(isoDate: string, today: string): number {
  const a = Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10));
  const b = Date.UTC(+isoDate.slice(0, 4), +isoDate.slice(5, 7) - 1, +isoDate.slice(8, 10));
  return Math.round((b - a) / DAY_MS);
}

export function buildOverview(
  challenges: readonly OverviewChallenge[],
  ideaChallengeIds: readonly string[],
  today: string,
): Overview {
  const ideasByChallenge = new Map<string, number>();
  const known = new Set(challenges.map((c) => c.id));
  let ideas = 0;
  for (const id of ideaChallengeIds) {
    if (!known.has(id)) continue;
    ideasByChallenge.set(id, (ideasByChallenge.get(id) ?? 0) + 1);
    ideas += 1;
  }

  const published = challenges.filter((c) => c.status === "published");
  const upcoming = published
    .map((c) => ({ id: c.id, title: c.title, deadline: c.deadline, daysLeft: daysUntil(c.deadline, today) }))
    .filter((c) => c.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft || a.title.localeCompare(b.title));

  return {
    total: challenges.length,
    published: published.length,
    drafts: challenges.filter((c) => c.status === "draft").length,
    ideas,
    ideasByChallenge,
    nextDeadline: upcoming[0] ?? null,
  };
}

export function daysLeftLabel(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}
