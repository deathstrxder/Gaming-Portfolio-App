import { db } from "@/lib/db";
import { deleteUser } from "@/lib/db/users";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  if (!session.userId) return Response.json({ error: "unauthenticated" }, { status: 401 });

  deleteUser(db, session.userId);
  session.destroy();
  return Response.json({ ok: true });
}
