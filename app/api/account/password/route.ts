import { z } from "zod";
import { db } from "@/lib/db";
import { changePassword } from "@/lib/db/users";
import { isPasswordValid } from "@/lib/auth/password";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().max(200) });

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) return Response.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400 });
  if (!isPasswordValid(parsed.data.newPassword)) {
    return Response.json({ error: "weak_password" }, { status: 400 });
  }

  const res = changePassword(db, session.userId, parsed.data.currentPassword, parsed.data.newPassword);
  if (!res.ok) return Response.json({ error: res.error }, { status: 403 });
  return Response.json({ ok: true });
}
