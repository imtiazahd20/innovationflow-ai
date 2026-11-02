import { describe, expect, it } from "vitest";
import { isAuthPage, isProtectedPath, publicPathFor, redirectTargetFor } from "./routes";

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

describe("shared challenge addresses", () => {
  const id = "11111111-1111-4111-8111-111111111111";

  it("sends logged-out visitors from a challenge address to its public page", () => {
    expect(redirectTargetFor(`/dashboard/challenges/${id}`, false)).toBe(`/c/${id}`);
    expect(redirectTargetFor(`/dashboard/challenges/${id}/`, false)).toBe(`/c/${id}`);
  });

  it("keeps edit and plan pages private", () => {
    expect(redirectTargetFor(`/dashboard/challenges/${id}/edit`, false)).toBe("/login");
    expect(redirectTargetFor(`/dashboard/challenges/${id}/plan`, false)).toBe("/login");
    expect(redirectTargetFor("/dashboard/challenges/new", false)).toBe("/login");
    expect(publicPathFor("/dashboard/challenges/not-an-id")).toBeNull();
  });

  it("leaves signed-in people where they are", () => {
    expect(redirectTargetFor(`/dashboard/challenges/${id}`, true)).toBeNull();
  });
});
