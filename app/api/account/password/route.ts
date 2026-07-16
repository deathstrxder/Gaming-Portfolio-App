import { z } from "zod";
import { db } from "@/lib/db";
import { changePassword, setPassword, getUserById } from "@/lib/db/users";
import { isPasswordValid } from "@/lib/auth/password";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().max(200),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) return Response.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400 });
  if (!isPasswordValid(parsed.data.newPassword)) {
    return Response.json({ error: "weak_password" }, { status: 400 });
  }

  const user = getUserById(db, session.userId);
  if (!user) return Response.json({ error: "unauthenticated" }, { status: 401 });

  // Google-only account (no password yet): set an initial password directly.
  if (user.passwordHash === null) {
    setPassword(db, session.userId, parsed.data.newPassword);
    return Response.json({ ok: true });
  }

  // Existing password account: require and verify the current password.
  if (!parsed.data.currentPassword) {
    return Response.json({ error: "wrong_password" }, { status: 403 });
  }
  const res = changePassword(
    db,
    session.userId,
    parsed.data.currentPassword,
    parsed.data.newPassword,
  );
  if (!res.ok) return Response.json({ error: res.error }, { status: 403 });
  return Response.json({ ok: true });
}
