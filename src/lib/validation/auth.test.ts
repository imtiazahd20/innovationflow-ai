import { describe, expect, it } from "vitest";
import { validateCredentials } from "./auth";

describe("validateCredentials: sign in", () => {
  it("accepts a normal email and any non-empty password", () => {
    const result = validateCredentials(
      { email: "  Jane@Example.COM ", password: "x" },
      "signin",
    );
    expect(result).toEqual({
      ok: true,
      value: { email: "jane@example.com", password: "x" },
    });
  });

  it("asks for both fields when empty", () => {
    const result = validateCredentials({ email: "", password: "" }, "signin");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.email).toMatch(/enter your email/i);
      expect(result.errors.password).toMatch(/enter your password/i);
    }
  });

  it("rejects an invalid email", () => {
    for (const email of ["jane", "jane@", "@example.com", "jane@example", "a b@c.de"]) {
      const result = validateCredentials({ email, password: "secret" }, "signin");
      expect(result.ok, email).toBe(false);
    }
  });

  it("does not enforce the minimum length when signing in", () => {
    const result = validateCredentials({ email: "a@b.co", password: "123" }, "signin");
    expect(result.ok).toBe(true);
  });
});

describe("validateCredentials: sign up", () => {
  it("requires at least 8 characters", () => {
    const short = validateCredentials({ email: "a@b.co", password: "1234567" }, "signup");
    expect(short.ok).toBe(false);
    if (!short.ok) expect(short.errors.password).toMatch(/at least 8/i);

    const ok = validateCredentials({ email: "a@b.co", password: "12345678" }, "signup");
    expect(ok.ok).toBe(true);
  });

  it("rejects passwords longer than 72 characters", () => {
    const result = validateCredentials(
      { email: "a@b.co", password: "x".repeat(73) },
      "signup",
    );
    expect(result.ok).toBe(false);
  });
});

describe("validateCredentials: unexpected input", () => {
  it("treats non-text values as empty", () => {
    const result = validateCredentials({ email: null, password: 42 }, "signin");
    expect(result.ok).toBe(false);
  });
});
