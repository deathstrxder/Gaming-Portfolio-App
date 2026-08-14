import { z } from "zod";
import { db } from "@/lib/db";
import { getUserByEmail, verifyPassword, getProfile } from "@/lib/db/users";
import { getSession, loginSessionOptions } from "@/lib/auth/session";
import { ADMIN_USERNAME, ADMIN_EMAIL } from "@/lib/auth/admin";
import { clientIp } from "@/lib/security/client-ip";
import { guard, LIMITS } from "@/lib/security/limits";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
  remember: z.boolean().optional(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400 });

  // Address bucket first. Its key space is bounded by the address space, so it
  // is safe to consume before any lookup.
  const byIp = await guard(LIMITS.loginIp, clientIp(request));
  if (byIp) return byIp;

  const { identifier, password, remember = false } = parsed.data;
  const email = identifier === ADMIN_USERNAME ? ADMIN_EMAIL : identifier.toLowerCase();

  const user = await getUserByEmail(db, email);

  // Account bucket only once the identifier resolves to a real account. The
  // identifier is arbitrary caller-supplied text, so consuming it earlier would
  // let an attacker mint one rate_limits row per invented identifier.
  //
  // Both checks sit ABOVE verifyPassword deliberately: the bcrypt compare is
  // the expensive step this throttle exists to protect, and a check below it
  // would spend the CPU before deciding not to.
  if (user) {
    const byAccount = await guard(LIMITS.loginAccount, String(user.id));
    if (byAccount) return byAccount;
  }

  if (!user || !verifyPassword(user, password)) {
    return Response.json({ error: "bad_credentials" }, { status: 401 });
  }
  if (!user.emailVerified) return Response.json({ error: "unverified" }, { status: 403 });

  const profile = await getProfile(db, user.id);
  const session = await getSession(loginSessionOptions(remember));
  session.userId = user.id;
  session.role = profile?.role ?? "user";
  session.username = profile?.username;
  await session.save();
  return Response.json({ ok: true, role: session.role, username: session.username ?? null });
}
