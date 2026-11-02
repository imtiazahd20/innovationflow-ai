import { describe, expect, it } from "vitest";
import {
  commentStatusMessage,
  formatSize,
  parseDiscussion,
  publicFileUrl,
  validateComment,
  validateFiles,
} from "./schema";

const pdf = { name: "a.pdf", type: "application/pdf", size: 1000 };

describe("validateFiles", () => {
  it("accepts allowed files", () => expect(validateFiles([pdf, { ...pdf, name: "b.png", type: "image/png" }])).toBeNull());
  it("accepts none", () => expect(validateFiles([])).toBeNull());
  it("rejects more than 3", () => expect(validateFiles([pdf, pdf, pdf, pdf])).toMatch(/at most 3/));
  it("rejects unknown types", () =>
    expect(validateFiles([{ name: "x.exe", type: "application/x-msdownload", size: 5 }])).toMatch(/can't be attached/));
  it("rejects html and svg", () => {
    expect(validateFiles([{ name: "x.html", type: "text/html", size: 5 }])).not.toBeNull();
    expect(validateFiles([{ name: "x.svg", type: "image/svg+xml", size: 5 }])).not.toBeNull();
  });
  it("rejects empty and oversized", () => {
    expect(validateFiles([{ ...pdf, size: 0 }])).toMatch(/empty/);
    expect(validateFiles([{ ...pdf, size: 5 * 1024 * 1024 + 1 }])).toMatch(/5 MB/);
    expect(validateFiles([{ ...pdf, size: 5 * 1024 * 1024 }])).toBeNull();
  });
});

describe("validateComment", () => {
  it("needs text", () => expect(validateComment("   ")).toMatch(/Write a comment/));
  it("limits length", () => {
    expect(validateComment("x".repeat(2000))).toBeNull();
    expect(validateComment("x".repeat(2001))).toMatch(/2000/);
  });
});

describe("helpers", () => {
  it("formatSize", () => {
    expect(formatSize(500)).toBe("500 B");
    expect(formatSize(2048)).toBe("2 KB");
    expect(formatSize(3.5 * 1024 * 1024)).toBe("3.5 MB");
  });
  it("publicFileUrl", () =>
    expect(publicFileUrl("https://x.supabase.co/", "t/a/b.pdf")).toBe("https://x.supabase.co/storage/v1/object/public/idea-files/t/a/b.pdf"));
  it("commentStatusMessage", () => {
    expect(commentStatusMessage("ok")).toBeNull();
    expect(commentStatusMessage("forbidden")).toMatch(/can't comment/);
    expect(commentStatusMessage(undefined)).toMatch(/couldn't post/);
  });
  it("parseDiscussion", () => {
    expect(parseDiscussion(null)).toBeNull();
    expect(parseDiscussion({ viewer: { role: "x" } })).toBeNull();
    const ok = {
      viewer: { role: "submitter", name: "A", idea_id: "i" },
      challenge: { id: "c", title: "t", status: "published", deadline: "2027-01-01" },
      ideas: [{ id: "i", submitter_name: "A", title: "t", description: "d", created_at: "x", comments: [] }],
    };
    expect(parseDiscussion(ok)).not.toBeNull();
  });
});
