import type { GoogleOutcome } from "@/lib/db/users";

interface RedirectInput {
  /** Whether the resolved account already has a profile username. */
  hasUsername: boolean;
  outcome: GoogleOutcome;
}

/**
 * Where to send the browser after a successful Google sign-in, and what to tell
 * it on arrival.
 *
 * Pure, and separate from the route, because the interesting behaviour is the
 * decision rather than the OAuth exchange — testing it here needs no mocking of
 * token validation, cookies or the database.
 *
 * An earlier version carried a signup/login "intent" across the round trip, so
 * it could tell someone who pressed Google on the SIGN UP step that they
 * already had an account. The unified auth panel removed the need: there is no
 * longer a moment where the user is told they are signing up before the app
 * knows whether they are. Deleting that machinery was the point of the
 * restructure rather than a side effect — the ambiguity is gone at the source,
 * so nothing downstream has to explain it.
 */
export function postAuthRedirect({ hasUsername, outcome }: RedirectInput): string {
  const path = hasUsername ? "/subscribe" : "/";
  const hash = hasUsername ? "" : "#support";

  // The one thing still worth saying: a claim took ownership of an account
  // whose email was never confirmed, and destroyed the password set on it.
  if (outcome === "claimed") return `${path}?claimed=1${hash}`;

  return `${path}${hash}`;
}
