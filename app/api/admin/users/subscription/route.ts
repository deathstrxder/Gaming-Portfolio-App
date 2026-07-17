import { z } from "zod";
import { db } from "@/lib/db";
import { modifySubscription } from "@/lib/db/users";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  userId: z.number().int().positive(),
  action: z.enum(["add", "extend", "shorten", "remove"]),
  months: z.number().int().min(1).max(60).optional(),
});

export async function POST(request: Request) {
  if ((await requireAdmin()) === null) return Response.json({ error: "forbidden" }, { status: 403 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400 });
  modifySubscription(db, parsed.data.userId, parsed.data.action, parsed.data.months);
  return Response.json({ ok: true });
}
