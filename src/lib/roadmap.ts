// The development roadmap shown on the /roadmap page, kept in code so it changes together with
// the features it describes. Update an item's status in the SAME commit that ships it.
//
// Rule for this project: only free tools and free tiers for now. Anything that would cost money
// stays on the roadmap with status "deferred" and a costNote saying what it would need.

export type RoadmapStatus = "done" | "in-progress" | "next" | "planned" | "deferred";

export type RoadmapItem = {
  id: string;
  title: string;
  detail?: string;
  status: RoadmapStatus;
  // Required for "deferred": which paid service or plan it is waiting for.
  costNote?: string;
};

export type RoadmapPhase = {
  id: string;
  number: number;
  title: string;
  goal: string;
  items: RoadmapItem[];
};

export type ChangelogEntry = {
  date: string; // YYYY-MM-DD
  title: string;
  changes: string[];
};

export const STATUS_LABELS: Record<RoadmapStatus, string> = {
  done: "Done",
  "in-progress": "In progress",
  next: "Up next",
  planned: "Planned",
  deferred: "Deferred: needs a paid service",
};

export const ROADMAP: RoadmapPhase[] = [
  {
    id: "audit",
    number: 1,
    title: "Prototype audit",
    goal: "Understand what already works before changing anything.",
    items: [
      { id: "audit-inventory", title: "Feature inventory: working, partial, not built", status: "done" },
      { id: "audit-gaps", title: "Gap analysis against the product vision", status: "done" },
      { id: "audit-security", title: "Security and technical-debt review", status: "done" },
      { id: "audit-roadmap-tab", title: "Roadmap tab inside the platform (this page)", status: "done" },
    ],
  },
  {
    id: "architecture",
    number: 2,
    title: "Product architecture",
    goal: "Agree the design on paper before any big change to the database.",
    items: [
      { id: "arch-tech", title: "Technical architecture document", status: "done" },
      { id: "arch-db", title: "Database schema document (current and proposed)", status: "done" },
      { id: "arch-prd", title: "Product requirements document", status: "next" },
      { id: "arch-roles", title: "Role and permission matrix", status: "done" },
      { id: "arch-journeys", title: "User journeys for the five core workflows", status: "next" },
    ],
  },
  {
    id: "core",
    number: 3,
    title: "Core platform",
    goal: "Organisations, roles and navigation that every module shares.",
    items: [
      { id: "core-auth", title: "Email and password sign-in with email confirmation", status: "done" },
      { id: "core-protected", title: "Protected dashboard and secure database rules", status: "done" },
      { id: "core-orgs", title: "Organisations (workspaces), keeping all existing challenges", status: "done" },
      {
        id: "core-roles",
        title: "Roles: admin, organiser, judge, mentor, participant, project owner",
        detail: "Admin and organiser are active; the other roles get their screens in later phases.",
        status: "done",
      },
      { id: "core-invites", title: "Invite colleagues to an organisation", status: "done" },
      { id: "core-nav", title: "App navigation for the three modules", status: "done" },
      {
        id: "core-org-dashboard",
        title: "Organisation dashboard",
        detail: "Overview of challenges, ideas and the next deadline is live; judging progress comes with analytics.",
        status: "in-progress",
      },
      {
        id: "core-notifications",
        title: "In-app notifications",
        detail: "New ideas notify admins and organisers; new members notify admins. Bell with unread count in the header.",
        status: "done",
      },
      {
        id: "core-activity",
        title: "Activity log for important actions",
        detail: "Recorded by the database; admins and organisers see it on the workspace page.",
        status: "done",
      },
      { id: "core-migrations", title: "Database changes tracked with the free Supabase CLI", status: "next" },
      { id: "core-google-login", title: "Sign in with Google or Microsoft", status: "planned" },
    ],
  },
  {
    id: "sprint-planner",
    number: 4,
    title: "Innovation Sprint Planner",
    goal: "Plan, launch and run challenges and hackathons.",
    items: [
      { id: "sp-challenges", title: "Create, edit and delete challenges", status: "done" },
      { id: "sp-plan", title: "Brief, weighted judging criteria and timeline editor", status: "done" },
      { id: "sp-template", title: "Draft a plan from a template", status: "done" },
      { id: "sp-ai-draft", title: "Draft the plan with AI (Google Gemini, free tier)", status: "done" },
      { id: "sp-publish", title: "Publish a challenge with a shareable link", status: "done" },
      { id: "sp-lifecycle", title: "Statuses: draft, published, active, completed, archived", status: "planned" },
      { id: "sp-programs", title: "Innovation programmes that group several challenges", status: "planned" },
      { id: "sp-formats", title: "Event formats: internal, external, hybrid, virtual, university, developer", status: "planned" },
      { id: "sp-ai-generator", title: "Full AI Challenge Generator: title, eligibility, rubric, metrics, messages", status: "planned" },
      { id: "sp-event-page", title: "Event page: schedule, countdown, FAQ, rules, resources, announcements", status: "planned" },
      { id: "sp-registration", title: "Registration with approval, profiles and skills", status: "planned" },
      { id: "sp-teams", title: "Teams: create, invite, accept, manage", status: "planned" },
      { id: "sp-ai-teams", title: "AI team matching by complementary skills", status: "planned" },
      { id: "sp-mentors", title: "Mentors: expertise, assignment to teams, sessions, feedback", status: "planned" },
      { id: "sp-export", title: "Export participants as a spreadsheet (CSV)", status: "planned" },
    ],
  },
  {
    id: "ai-judge",
    number: 5,
    title: "AI Judge & Submission Copilot",
    goal: "Faster, fairer and explainable evaluation, with humans making the final call.",
    items: [
      { id: "aj-submit", title: "Public idea submission without an account", status: "done" },
      { id: "aj-discussion", title: "Private discussion thread per idea, with attachments", status: "done" },
      { id: "aj-judges", title: "Invite judges and score ideas on each criterion", status: "done" },
      { id: "aj-ranking", title: "Weighted totals and ranking", status: "done" },
      { id: "aj-rich-submissions", title: "Richer submissions: solution, category, team, links, files", status: "planned" },
      { id: "aj-edit", title: "Edit a submission until the deadline", status: "planned" },
      { id: "aj-copilot", title: "AI Submission Copilot: clarity, gaps, alignment (assists, never writes it all)", status: "planned" },
      { id: "aj-ai-judge", title: "AI Judge: per-criterion scores, reasons, evidence, confidence", status: "planned" },
      { id: "aj-compare", title: "AI vs human score comparison with explained disagreements", status: "planned" },
      { id: "aj-assign", title: "Judge assignment, expertise and conflict-of-interest declarations", status: "planned" },
      { id: "aj-leaderboard", title: "Leaderboard kept private until announced", status: "planned" },
      { id: "aj-winners", title: "Winners, awards and public or private showcase", status: "planned" },
      { id: "aj-certificates", title: "Printable winner certificates", status: "planned" },
    ],
  },
  {
    id: "impact",
    number: 6,
    title: "Innovation-to-Impact Tracker",
    goal: "Turn winning ideas into projects and measure the value they create.",
    items: [
      { id: "it-pipeline", title: "Innovation pipeline with stages you can customise", status: "planned" },
      { id: "it-convert", title: "Convert an approved idea into a project, keeping its history", status: "planned" },
      { id: "it-projects", title: "Project workspace: owner, team, milestones, tasks, budget", status: "planned" },
      { id: "it-experiments", title: "Experiments: hypothesis, success criteria, results, decision", status: "planned" },
      { id: "it-impact", title: "Business impact: estimated vs verified, ROI", status: "planned" },
      { id: "it-advisor", title: "AI Innovation Advisor: risks, next steps, resources", status: "planned" },
    ],
  },
  {
    id: "ai-layer",
    number: 7,
    title: "AI across the workflows",
    goal: "One shared AI layer that every feature uses, with limits and an audit trail.",
    items: [
      { id: "ai-gemini", title: "Server-side Gemini client with structured, validated answers", status: "done" },
      { id: "ai-providers", title: "Swap or add AI providers without rewriting features", status: "planned" },
      { id: "ai-usage", title: "AI usage log and daily limits per organisation", status: "planned" },
      { id: "ai-eval-log", title: "Keep a record of every AI evaluation and recommendation", status: "planned" },
      { id: "ai-reports", title: "AI executive report generator", status: "planned" },
      {
        id: "ai-paid-tier",
        title: "Higher AI limits and private data handling",
        status: "deferred",
        costNote: "Gemini paid tier (free tier has daily caps and may use prompts to improve Google's products).",
      },
    ],
  },
  {
    id: "analytics",
    number: 8,
    title: "Analytics and reporting",
    goal: "Dashboards and reports for every role.",
    items: [
      { id: "an-role-dashboards", title: "Dashboards for organiser, judge, participant and innovation manager", status: "planned" },
      { id: "an-hackathon", title: "Hackathon analytics: registrations, teams, submissions, judging progress", status: "planned" },
      { id: "an-impact", title: "Impact reports: estimated vs actual value", status: "planned" },
      { id: "an-export", title: "Export reports as CSV and print-ready pages", status: "planned" },
    ],
  },
  {
    id: "saas",
    number: 9,
    title: "SaaS readiness and integrations",
    goal: "Plans, limits and connections, built on free tiers until revenue justifies paid ones.",
    items: [
      { id: "saas-plans", title: "Configurable plans and limits (users, events, storage, AI)", status: "planned" },
      { id: "saas-billing-test", title: "Billing flow in Stripe test mode (no real charges)", status: "planned" },
      { id: "int-webhooks", title: "Slack and Microsoft Teams announcements via incoming webhooks", status: "planned" },
      { id: "int-calendar", title: "Add event dates to any calendar (.ics download)", status: "planned" },
      { id: "int-github", title: "GitHub repository links on submissions", status: "planned" },
      { id: "int-email", title: "Email notifications on a free email-service tier", status: "planned" },
      {
        id: "saas-billing-live",
        title: "Take real payments",
        status: "deferred",
        costNote: "Stripe charges a fee per payment; also needs a business account.",
      },
      {
        id: "saas-vercel-pro",
        title: "Commercial hosting",
        status: "deferred",
        costNote: "Vercel's free Hobby plan is for non-commercial use; selling the product needs Vercel Pro.",
      },
      {
        id: "saas-supabase-pro",
        title: "Database that never pauses, with daily backups",
        status: "deferred",
        costNote: "Supabase Pro; free projects pause after a week without activity.",
      },
      {
        id: "saas-sso",
        title: "Enterprise single sign-on (SAML)",
        status: "deferred",
        costNote: "Supabase Pro or above.",
      },
      {
        id: "saas-domain",
        title: "Custom domain and branded email sender",
        status: "deferred",
        costNote: "Domain registration (yearly fee).",
      },
    ],
  },
  {
    id: "testing",
    number: 10,
    title: "Testing and launch",
    goal: "Prove the five end-to-end workflows before calling anything finished.",
    items: [
      { id: "test-unit", title: "Automated tests for rules, scoring and AI clean-up", status: "in-progress" },
      { id: "test-rls", title: "Database security test script", status: "done" },
      { id: "test-security-patch", title: "Keep Next.js on a patched version (16.4.6)", status: "done" },
      { id: "test-e2e", title: "Browser tests of the five workflows (free Playwright)", status: "planned" },
      { id: "test-responsive", title: "Phone, tablet and desktop checks for every page", status: "planned" },
    ],
  },
];

// Newest first.
export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-11-28",
    title: "Activity log and notifications",
    changes: [
      "A bell in the header shows unread notifications; the Notifications page lists them, with mark-all-read.",
      "Admins and organisers are told when a new idea arrives; admins when someone joins the workspace.",
      "The workspace page shows recent activity: challenges, ideas, invitations and role changes.",
    ],
  },
  {
    date: "2026-11-28",
    title: "App navigation and dashboard overview",
    changes: [
      "A menu on every dashboard page: Dashboard, Members & roles, the three modules and the Roadmap.",
      "Modules that aren't built yet are marked \"Soon\" and open their place on the roadmap.",
      "The dashboard shows your challenges, how many are published, ideas received and the next deadline.",
    ],
  },
  {
    date: "2026-11-27",
    title: "Workspaces and roles",
    changes: [
      "Every challenge now belongs to a workspace. Your existing challenges moved into your own workspace, unchanged.",
      "Invite colleagues by email as admin, organiser, judge, mentor, participant or project owner.",
      "Admins and organisers manage the workspace's challenges; removing someone removes their access.",
    ],
  },
  {
    date: "2026-11-27",
    title: "Roadmap, AI drafting and a security update",
    changes: [
      "Added this Roadmap tab and a full audit of the prototype.",
      "\"Draft with AI\" writes a challenge's brief, judging criteria and timeline (Google Gemini, free tier).",
      "Upgraded Next.js to 16.4.6 to fix known security issues.",
    ],
  },
  {
    date: "2026-11-02",
    title: "Judging and discussion",
    changes: [
      "Judges score ideas on six weighted categories; totals and ranks are visible to everyone involved.",
      "Discussion threads with attachments for submitters, judges and the owner, refreshing every few seconds.",
      "Tab bar across a challenge's pages; ideas shown as cards with a pop-up.",
    ],
  },
  {
    date: "2026-10-30",
    title: "Innovation Sprint Planner",
    changes: [
      "Sign in, create challenges, plan the brief, criteria and timeline, and publish a shareable link.",
      "Anyone with the link can submit an idea, no account needed.",
    ],
  },
];

export type Progress = { done: number; total: number; percent: number };

// Deferred items wait on money, not work, so they don't count against progress.
export function phaseProgress(items: RoadmapItem[]): Progress {
  const counted = items.filter((i) => i.status !== "deferred");
  const done = counted.filter((i) => i.status === "done").length;
  const total = counted.length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export function overallProgress(phases: RoadmapPhase[] = ROADMAP): Progress {
  return phaseProgress(phases.flatMap((p) => p.items));
}

export function deferredItems(phases: RoadmapPhase[] = ROADMAP): (RoadmapItem & { phase: string })[] {
  return phases.flatMap((p) => p.items.filter((i) => i.status === "deferred").map((i) => ({ ...i, phase: p.title })));
}
