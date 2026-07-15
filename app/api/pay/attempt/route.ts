import { z } from "zod";
import { db } from "@/lib/db";
import { recordPaymentAttempt } from "@/lib/db/users";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  last4: z.string().regex(/^\d{4}$/).nullable(),
  brand: z.string().min(1).max(20),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.userId) return Response.json({ error: "unauthenticated" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400 });

  // Record the (masked) attempt; the subscription is intentionally NOT activated.
  recordPaymentAttempt(db, session.userId, parsed.data.last4, parsed.data.brand);
  return Response.json({ ok: true, status: "unavailable" });
}
