import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

// Touches the DB, so it must run per-request rather than be prerendered.
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = db.select().from(users).all();
  return Response.json({ ok: true, users: rows.length });
}
