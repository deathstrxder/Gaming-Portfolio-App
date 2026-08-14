import { z } from "zod";
import { db } from "@/lib/db";
import { verifyEmailCode } from "@/lib/auth/codes";
import { getProfile, getUserById } from "@/lib/db/users";
import { getSession } from "@/lib/auth/session";
import { clearPendingSignup } from "@/lib/auth/pending";
import { guard, LIMITS } from "@/lib/security/limits";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ userId: z.number().int().positive(), code: z.string().length(6) });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400 });

  // Resolved before the bucket is consumed, so an attacker cannot mint one
  // rate_limits row per invented id. A body userId is safe to accept here for a
  // different reason than on resend: guessing a live code costs ~200,000
  // expected attempts against a 5-attempt-per-code counter, and a wrong guess
  // spends the attacker's own budget instead of sending anything.
  const user = await getUserById(db, parsed.data.userId);
  if (!user) return Response.json({ error: "bad_code" }, { status: 400 });

  const throttled = await guard(LIMITS.verifyUser, String(user.id));
  if (throttled) return throttled;

  if (!(await verifyEmailCode(db, parsed.data.userId, parsed.data.code))) {
    return Response.json({ error: "bad_code" }, { status: 400 });
  }

  await clearPendingSignup();

  const profile = await getProfile(db, parsed.data.userId);
  const session = await getSession();
  session.userId = parsed.data.userId;
  session.role = profile?.role ?? "user";
  session.username = profile?.username;
  await session.save();
  return Response.json({ ok: true, username: session.username ?? null });
}
