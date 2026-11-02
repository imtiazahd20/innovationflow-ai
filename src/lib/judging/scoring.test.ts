import { describe, expect, it } from "vitest";
import {
  judgeTotal,
  myScores,
  parseJudgeEmail,
  parseJudging,
  parseScoreForm,
  rankIdeas,
  type Criterion,
  type JudgingIdea,
  type Score,
} from "./scoring";

const criteria: Criterion[] = [
  { id: "c1", name: "Impact", description: null, weight: 60 },
  { id: "c2", name: "Feasibility", description: null, weight: 40 },
];
const idea = (id: string, created: string): JudgingIdea => ({
  id,
  submitter_name: "N",
  title: id,
  description: "d",
  created_at: created,
});
const sc = (idea_id: string, judge_id: string, c1: number, c2: number): Score[] => [
  { idea_id, judge_id, criterion_id: "c1", score: c1 },
  { idea_id, judge_id, criterion_id: "c2", score: c2 },
];

describe("judgeTotal", () => {
  it("weights each criterion", () => {
    expect(judgeTotal(criteria, new Map([["c1", 10], ["c2", 0]]))).toBeCloseTo(6);
    expect(judgeTotal(criteria, new Map([["c1", 5], ["c2", 5]]))).toBeCloseTo(5);
  });
  it("is null until every criterion is scored", () => {
    expect(judgeTotal(criteria, new Map([["c1", 10]]))).toBeNull();
    expect(judgeTotal([], new Map())).toBeNull();
  });
  it("copes with weights that do not add to 100", () => {
    const odd: Criterion[] = [{ ...criteria[0], weight: 30 }, { ...criteria[1], weight: 20 }];
    expect(judgeTotal(odd, new Map([["c1", 10], ["c2", 10]]))).toBeCloseTo(10);
  });
});

describe("rankIdeas", () => {
  const ideas = [idea("a", "2026-01-01"), idea("b", "2026-01-02"), idea("c", "2026-01-03"), idea("d", "2026-01-04")];
  it("averages judges and sorts best first", () => {
    const scores = [...sc("a", "j1", 4, 4), ...sc("a", "j2", 6, 6), ...sc("b", "j1", 9, 9), ...sc("c", "j1", 1, 1)];
    const r = rankIdeas(ideas, criteria, scores);
    expect(r.map((x) => x.idea.id)).toEqual(["b", "a", "c", "d"]);
    expect(r.map((x) => x.rank)).toEqual([1, 2, 3, null]);
    expect(r[1].average).toBe(5);
    expect(r[1].judgesScored).toBe(2);
  });
  it("gives equal averages the same rank", () => {
    const scores = [...sc("a", "j1", 7, 7), ...sc("b", "j1", 7, 7), ...sc("c", "j1", 2, 2)];
    expect(rankIdeas(ideas, criteria, scores).map((x) => x.rank)).toEqual([1, 1, 3, null]);
  });
  it("ignores a judge who has only partly scored an idea", () => {
    const scores = [...sc("a", "j1", 8, 8), { idea_id: "a", judge_id: "j2", criterion_id: "c1", score: 0 }];
    const r = rankIdeas(ideas, criteria, scores);
    expect(r[0].judgesScored).toBe(1);
    expect(r[0].average).toBe(8);
  });
  it("works with no scores at all", () => {
    const r = rankIdeas(ideas, criteria, []);
    expect(r.every((x) => x.rank === null && x.average === null)).toBe(true);
    expect(r.map((x) => x.idea.id)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("parseScoreForm", () => {
  const form = (o: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(o)) f.set(k, v);
    return f;
  };
  it("reads valid scores and skips empty ones", () => {
    expect(parseScoreForm(form({ score_c1: "7", score_c2: "" }), criteria)).toEqual({ ok: true, scores: { c1: 7 } });
  });
  it("accepts 0 and 10", () => {
    expect(parseScoreForm(form({ score_c1: "0", score_c2: "10" }), criteria)).toEqual({ ok: true, scores: { c1: 0, c2: 10 } });
  });
  it("rejects out of range, fractions and text", () => {
    for (const bad of ["11", "-1", "4.5", "abc", "1e1"]) {
      expect(parseScoreForm(form({ score_c1: bad }), criteria).ok).toBe(false);
    }
  });
  it("needs at least one score", () => {
    expect(parseScoreForm(form({}), criteria).ok).toBe(false);
  });
});

describe("misc", () => {
  it("myScores picks one judge's scores for one idea", () => {
    const m = myScores([...sc("a", "j1", 3, 4), ...sc("a", "j2", 9, 9)], "a", "j1");
    expect(m.get("c1")).toBe(3);
    expect(m.get("c2")).toBe(4);
  });
  it("parseJudgeEmail lowercases and validates", () => {
    expect(parseJudgeEmail("  Judge@Example.COM ")).toEqual({ ok: true, email: "judge@example.com" });
    expect(parseJudgeEmail("nope").ok).toBe(false);
    expect(parseJudgeEmail("").ok).toBe(false);
  });
  it("parseJudging rejects wrong shapes and null", () => {
    expect(parseJudging(null)).toBeNull();
    expect(parseJudging({ role: "hacker" })).toBeNull();
    expect(
      parseJudging({ role: "owner", challenge: { id: "x", title: "t", status: "draft" }, criteria: [], ideas: [], scores: [], judges: [] }),
    ).not.toBeNull();
  });
});
