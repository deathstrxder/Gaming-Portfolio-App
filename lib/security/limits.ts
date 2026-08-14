import { db } from "@/lib/db";
import { consume } from "./rate-limit";

/**
 * Every rate limit in the app, in one table.
 *
 * Collected here rather than inlined at each route so the whole policy can be
 * read at once, and so a limit cannot quietly diverge between the route that
 * enforces it and the documentation that describes it.
 *
 * Figures are derived in the design doc; the two worth restating:
 *
 * - `loginAccount` is the bound on a distributed attack against ONE account,
 *   because its subject is the account rather than the address. That is why
 *   there are no lockout columns on `users`.
 * - `eventsIp` is set from the observed behaviour of components/site/Analytics.tsx,
 *   which emits a button_click for every labelled click and a
 *   dodecahedron_interaction for every widget click — both unbounded per
 *   session. A limit near the ~100 an engaged visitor can produce would
 *   throttle real users.
 */
export const LIMITS = {
  loginIp: { bucket: "login-ip", limit: 10, windowSec: 600 },
  loginAccount: { bucket: "login-account", limit: 5, windowSec: 900 },
  signupIp: { bucket: "signup-ip", limit: 5, windowSec: 3600 },
  verifyUser: { bucket: "verify-user", limit: 10, windowSec: 600 },
  resendUser: { bucket: "resend-user", limit: 1, windowSec: 60 },
  resendIp: { bucket: "resend-ip", limit: 5, windowSec: 3600 },
  pwchangeUser: { bucket: "pwchange-user", limit: 10, windowSec: 3600 },
  eventsIp: { bucket: "events-ip", limit: 300, windowSec: 600 },
} as const;

export type LimitSpec = (typeof LIMITS)[keyof typeof LIMITS];

/**
 * Consumes one unit of `spec` for `subject`, returning a 429 Response when the
 * budget is spent and null when the caller should proceed.
 *
 * Returning a Response rather than throwing keeps the check visible in the
 * route's control flow, which matters because WHERE it sits is the security
 * property — a throttle after the bcrypt compare spends exactly the CPU it
 * exists to protect.
 *
 * An entity-subject bucket (anything keyed on a user id) must only be reached
 * after that entity is known to exist, or a caller can mint unbounded rows by
 * inventing subjects. IP-subject buckets are safe to consume immediately.
 */
export async function guard(spec: LimitSpec, subject: string): Promise<Response | null> {
  const result = await consume(db, spec.bucket, subject, spec.limit, spec.windowSec);
  if (result.ok) return null;

  return Response.json(
    { error: "rate_limited" },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } },
  );
}
