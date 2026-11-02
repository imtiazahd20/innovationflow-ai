import { describe, expect, it } from "vitest";
import { isClosed, parseIdeaForm, parseSubmitResult, submitStatusMessage } from "./schema";

const form = (o: Record<string, string>) => ({ get: (k: string) => o[k] });
const good = {
  name: "Aisha Rahman",
  email: "aisha@example.com",
  title: "Smart answer suggestions",
  description: "Suggest answers to agents from past tickets so repeats take seconds.",
};

describe("parseIdeaForm", () => {
  it("accepts a complete idea and trims it", () => {
    const r = parseIdeaForm(form({ ...good, name: "  Aisha Rahman  " }));
    expect(r.ok && r.value.name).toBe("Aisha Rahman");
  });

  it("explains each missing field", () => {
    const r = parseIdeaForm(form({}));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.name).toBe("Enter your name.");
      expect(r.errors.email).toBe("Enter your email address.");
      expect(r.errors.title).toBe("Give your idea a title.");
      expect(r.errors.description).toBe("Describe your idea.");
    }
  });

  it("rejects a bad email, a short description and too-long text", () => {
    const r = parseIdeaForm(
      form({ ...good, email: "not-an-email", description: "too short", title: "x".repeat(201) }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.email).toBe("Enter a valid email address.");
      expect(r.errors.description).toMatch(/at least 20/);
      expect(r.errors.title).toMatch(/at most 200/);
    }
  });

  it("ignores non-text values", () => {
    expect(parseIdeaForm({ get: () => new Blob() }).ok).toBe(false);
  });
});

describe("submitStatusMessage", () => {
  it("has no message for ok and a clear one for each problem", () => {
    expect(submitStatusMessage("ok")).toBeNull();
    expect(submitStatusMessage("closed")).toMatch(/closed/);
    expect(submitStatusMessage("not_found")).toMatch(/isn't accepting/);
    expect(submitStatusMessage("full")).toMatch(/limit/);
    expect(submitStatusMessage("duplicate")).toMatch(/already/);
    expect(submitStatusMessage("surprise")).toMatch(/try again/);
    expect(submitStatusMessage(undefined)).toMatch(/try again/);
  });
});

describe("isClosed", () => {
  it("accepts ideas on the deadline day and closes the day after", () => {
    expect(isClosed("2026-12-01", "2026-12-01")).toBe(false);
    expect(isClosed("2026-12-01", "2026-11-30")).toBe(false);
    expect(isClosed("2026-12-01", "2026-12-02")).toBe(true);
  });
});

describe("parseSubmitResult", () => {
  it("reads status and token", () => {
    expect(parseSubmitResult({ status: "ok", token: "abc" })).toEqual({ status: "ok", token: "abc" });
    expect(parseSubmitResult({ status: "duplicate" })).toEqual({ status: "duplicate", token: null });
  });
  it("treats anything else as an error", () => {
    expect(parseSubmitResult(null)).toEqual({ status: "error", token: null });
    expect(parseSubmitResult("ok")).toEqual({ status: "error", token: null });
  });
});
