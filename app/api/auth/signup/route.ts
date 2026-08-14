import { z } from "zod";
import { db } from "@/lib/db";
import { createUnverifiedUser } from "@/lib/db/users";
import { issueCode } from "@/lib/auth/codes";
import { isPasswordValid } from "@/lib/auth/password";
import { setPendingSignup } from "@/lib/auth/pending";
import { getMailer } from "@/lib/email";
import { verificationEmail } from "@/lib/email/messages";
import { clientIp } from "@/lib/security/client-ip";
import { guard, LIMITS } from "@/lib/security/limits";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ email: z.string().email(), password: z.string().max(200) });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400 });

  // Address bucket: bounded key space, so it is safe to consume before any
  // lookup. This is also the bound on how much mail one caller can make the
  // app send, and therefore on how fast a daily sending allowance can be drained.
  const throttled = await guard(LIMITS.signupIp, clientIp(request));
  if (throttled) return throttled;

  const email = parsed.data.email.toLowerCase();
  if (!isPasswordValid(parsed.data.password)) {
    return Response.json({ error: "weak_password" }, { status: 400 });
  }

  const res = await createUnverifiedUser(db, email, parsed.data.password);
  if (!res.ok) return Response.json({ error: res.error }, { status: 409 });

  const code = await issueCode(db, res.userId);

  // The code goes to the mailbox and NOWHERE else. It used to travel back in
  // this response and get rendered by the auth panel, which meant anyone could
  // register an address they did not own and verify it on the spot.
  try {
    await getMailer().send(verificationEmail(email, code));
  } catch {
    // The account stays. Deleting it would break the retry that recovers the
    // user: signing up again on an existing unverified account re-sends rather
    // than refusing, which is the only route back from a failed delivery.
    return Response.json({ error: "email_send_failed" }, { status: 503 });
  }

  await setPendingSignup(res.userId);
  return Response.json({ userId: res.userId }, { status: 201 });
}
