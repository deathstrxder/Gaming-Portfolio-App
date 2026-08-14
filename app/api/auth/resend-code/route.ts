import { db } from "@/lib/db";
import { getUserById } from "@/lib/db/users";
import { issueCode } from "@/lib/auth/codes";
import { getPendingSignup } from "@/lib/auth/pending";
import { getMailer } from "@/lib/email";
import { verificationEmail } from "@/lib/email/messages";
import { clientIp } from "@/lib/security/client-ip";
import { guard, LIMITS } from "@/lib/security/limits";

export const dynamic = "force-dynamic";

/**
 * Re-sends the verification code for the signup named by the pending cookie.
 *
 * This endpoint is the primary recovery path for the chosen mail setup: codes
 * are expected to land in spam sometimes, and without a resend a user whose
 * code never arrived has no way to finish.
 *
 * It deliberately takes NO userId from the request. Ids are small sequential
 * integers, so a body-supplied id would let a caller walk 1..N and mail a real
 * code to every registered address — harassment, plus a drained daily sending
 * allowance that disables signup for everyone.
 */
export async function POST(request: Request) {
  const userId = await getPendingSignup();
  if (userId === null) {
    return Response.json({ error: "no_pending_signup" }, { status: 400 });
  }

  // Address bucket first: bounded key space, and it is what stops a caller
  // cycling pending cookies to keep sending. The per-user cooldown below bounds
  // one account per minute, not one address across many accounts.
  const byIp = await guard(LIMITS.resendIp, clientIp(request));
  if (byIp) return byIp;

  const user = await getUserById(db, userId);
  if (!user || user.emailVerified) {
    return Response.json({ error: "no_pending_signup" }, { status: 400 });
  }

  // Entity bucket, only now that the account is known to exist.
  const byUser = await guard(LIMITS.resendUser, String(user.id));
  if (byUser) return byUser;

  const code = await issueCode(db, user.id);
  try {
    await getMailer().send(verificationEmail(user.email, code));
  } catch {
    return Response.json({ error: "email_send_failed" }, { status: 503 });
  }

  return Response.json({ ok: true });
}
