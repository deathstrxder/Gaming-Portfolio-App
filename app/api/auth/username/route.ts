import { z } from "zod";
import { db } from "@/lib/db";
import { setUsername, getProfile } from "@/lib/db/users";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  username: z.string().min(3).max(20).regex(/^[A-Za-z0-9_]+$/),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) return Response.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_username" }, { status: 400 });

  const res = setUsername(db, session.userId, parsed.data.username);
  if (!res.ok) return Response.json({ error: res.error }, { status: 409 });

  session.username = parsed.data.username;
  session.role = getProfile(db, session.userId)?.role ?? "user";
  await session.save();
  return Response.json({ ok: true, username: parsed.data.username });
}
