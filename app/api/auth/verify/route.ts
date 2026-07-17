import { z } from "zod";
import { db } from "@/lib/db";
import { verifyEmailCode } from "@/lib/auth/codes";
import { getProfile } from "@/lib/db/users";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ userId: z.number().int().positive(), code: z.string().length(6) });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400 });

  if (!verifyEmailCode(db, parsed.data.userId, parsed.data.code)) {
    return Response.json({ error: "bad_code" }, { status: 400 });
  }

  const profile = getProfile(db, parsed.data.userId);
  const session = await getSession();
  session.userId = parsed.data.userId;
  session.role = profile?.role ?? "user";
  session.username = profile?.username;
  await session.save();
  return Response.json({ ok: true, username: session.username ?? null });
}
