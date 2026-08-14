import { z } from "zod";
import { db } from "@/lib/db";
import { setEmailVerified } from "@/lib/db/users";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ userId: z.number().int().positive() });

/**
 * Marks an account verified by hand.
 *
 * This exists because the mail path is known to be unreliable: codes are sent
 * from a gmail.com address through a third-party relay, which cannot align
 * DMARC for that domain, so a share of them will be filed as junk or dropped.
 * Resending is the user's remedy; this is the owner's, for when resending does
 * not help either.
 *
 * Without it the only way to rescue a stuck account would be editing the
 * production database by hand — which is exactly the situation a deployed app
 * should never require.
 */
export async function POST(request: Request) {
  if ((await requireAdmin()) === null) return Response.json({ error: "forbidden" }, { status: 403 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400 });

  await setEmailVerified(db, parsed.data.userId);
  return Response.json({ ok: true });
}
