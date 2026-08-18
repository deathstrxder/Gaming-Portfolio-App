import { describe, it, expect } from "vitest";
import { postAuthRedirect } from "./google-redirect";

describe("postAuthRedirect", () => {
  it("sends a brand-new user to the support section to pick a username", () => {
    expect(postAuthRedirect({ hasUsername: false, outcome: "created" })).toBe("/#support");
  });

  it("sends a user who already has a username to the member area", () => {
    expect(postAuthRedirect({ hasUsername: true, outcome: "existing" })).toBe("/subscribe");
  });

  /**
   * Signing in when an account already exists is not news, and the unified
   * panel never told the user they were signing up in the first place, so there
   * is nothing to correct on arrival.
   */
  it("says nothing when an existing account simply signs in", () => {
    expect(postAuthRedirect({ hasUsername: true, outcome: "existing" })).toBe("/subscribe");
    expect(postAuthRedirect({ hasUsername: true, outcome: "linked" })).toBe("/subscribe");
  });

  it("says nothing when the account was genuinely created", () => {
    expect(postAuthRedirect({ hasUsername: false, outcome: "created" })).toBe("/#support");
  });

  /**
   * The one notice that survives: a claim destroyed a password. The common case
   * is a real user whose verification mail went to spam who used Google
   * instead, so staying silent would read as our bug.
   */
  it("reports a claimed account wherever it lands", () => {
    expect(postAuthRedirect({ hasUsername: true, outcome: "claimed" })).toBe(
      "/subscribe?claimed=1",
    );
    expect(postAuthRedirect({ hasUsername: false, outcome: "claimed" })).toBe(
      "/?claimed=1#support",
    );
  });
});
