// Central place for facts about the app that several screens will share.
// Keeping them in one file means we change a name or a module here once,
// and every page that uses it updates automatically.

export const APP_NAME = "InnovationFlow AI";

export const APP_TAGLINE =
  "Plan innovation challenges, evaluate submissions, and track winning ideas through to execution.";

export type ModuleStatus = "in-progress" | "planned";

export type AppModule = {
  id: string;
  name: string;
  description: string;
  status: ModuleStatus;
};

// The three connected modules of the product. We build them one at a time,
// so only the first is marked "in-progress".
export const MODULES: AppModule[] = [
  {
    id: "sprint-planner",
    name: "Innovation Sprint Planner",
    description:
      "Create a challenge, then let AI draft the brief, judging criteria and timeline for you to refine.",
    status: "in-progress",
  },
  {
    id: "ai-judge",
    name: "AI Judge & Submission Copilot",
    description:
      "Help participants shape their submissions and give judges consistent, explainable scoring support.",
    status: "planned",
  },
  {
    id: "impact-tracker",
    name: "Innovation-to-Impact Tracker",
    description:
      "Follow winning ideas from selection through delivery and measure what they achieve.",
    status: "planned",
  },
];
