import { describe, expect, it } from "vitest";
import { isAuthPage, isProtectedPath, redirectTargetFor } from "./routes";

describe("isProtectedPath", () => {
  it("protects the dashboard and everything under it", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/dashboard/challenges/123")).toBe(true);
  });

  it("does not protect public pages", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
  });

  it("does not match look-alike paths", () => {
    expect(isProtectedPath("/dashboards")).toBe(false);
    expect(isProtectedPath("/my-dashboard")).toBe(false);
  });
});

describe("isAuthPage", () => {
  it("recognises the login page", () => {
    expect(isAuthPage("/login")).toBe(true);
    expect(isAuthPage("/")).toBe(false);
  });
});

describe("redirectTargetFor", () => {
  it("sends logged-out visitors from the dashboard to login", () => {
    expect(redirectTargetFor("/dashboard", false)).toBe("/login");
    expect(redirectTargetFor("/dashboard/anything", false)).toBe("/login");
  });

  it("sends logged-in users from login to the dashboard", () => {
    expect(redirectTargetFor("/login", true)).toBe("/dashboard");
  });

  it("leaves everyone else where they are", () => {
    expect(redirectTargetFor("/", false)).toBeNull();
    expect(redirectTargetFor("/", true)).toBeNull();
    expect(redirectTargetFor("/login", false)).toBeNull();
    expect(redirectTargetFor("/dashboard", true)).toBeNull();
  });
});
