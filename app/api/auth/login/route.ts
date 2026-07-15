import { z } from "zod";
import { db } from "@/lib/db";
import { verifyCredentials, getProfile } from "@/lib/db/users";
import { getSession, loginSessionOptions } from "@/lib/auth/session";
import { ADMIN_USERNAME, ADMIN_EMAIL } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
  remember: z.boolean().optional(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400 });

  const { identifier, password, remember = false } = parsed.data;
  const email = identifier === ADMIN_USERNAME ? ADMIN_EMAIL : identifier.toLowerCase();

  const user = verifyCredentials(db, email, password);
  if (!user) return Response.json({ error: "bad_credentials" }, { status: 401 });
  if (!user.emailVerified) return Response.json({ error: "unverified" }, { status: 403 });

  const profile = getProfile(db, user.id);
  const session = await getSession(loginSessionOptions(remember));
  session.userId = user.id;
  session.role = profile?.role ?? "user";
  session.username = profile?.username;
  await session.save();
  return Response.json({ ok: true, role: session.role, username: session.username ?? null });
}
