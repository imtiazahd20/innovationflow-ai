import { describe, expect, it } from "vitest";
import { friendlyAuthError } from "./messages";

describe("friendlyAuthError", () => {
  it("explains wrong credentials without saying which part was wrong", () => {
    const text = friendlyAuthError({ code: "invalid_credentials" });
    expect(text).toMatch(/email and password/i);
  });

  it("recognises the older message-only form of the same error", () => {
    const text = friendlyAuthError({ message: "Invalid login credentials" });
    expect(text).toMatch(/email and password/i);
  });

  it("tells people to confirm their email", () => {
    expect(friendlyAuthError({ code: "email_not_confirmed" })).toMatch(/confirm your email/i);
  });

  it("explains rate limits", () => {
    expect(friendlyAuthError({ status: 429 })).toMatch(/too many/i);
    expect(friendlyAuthError({ code: "over_email_send_rate_limit" })).toMatch(/too many/i);
  });

  it("falls back to a generic message and never leaks raw error text", () => {
    const text = friendlyAuthError({ message: "duplicate key value violates constraint users_pkey" });
    expect(text).toMatch(/something went wrong/i);
    expect(text).not.toMatch(/duplicate key/i);
    expect(friendlyAuthError(null)).toMatch(/something went wrong/i);
  });
});
