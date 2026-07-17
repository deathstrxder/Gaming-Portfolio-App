import { z } from "zod";
import { db } from "@/lib/db";
import { deleteUser } from "@/lib/db/users";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ userId: z.number().int().positive() });

export async function POST(request: Request) {
  const adminId = await requireAdmin();
  if (adminId === null) return Response.json({ error: "forbidden" }, { status: 403 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400 });
  if (parsed.data.userId === adminId) return Response.json({ error: "cannot_delete_self" }, { status: 400 });
  deleteUser(db, parsed.data.userId);
  return Response.json({ ok: true });
}
