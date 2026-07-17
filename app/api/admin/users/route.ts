import { db } from "@/lib/db";
import { listAllUsers } from "@/lib/db/users";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  if ((await requireAdmin()) === null) return Response.json({ error: "forbidden" }, { status: 403 });
  return Response.json({ users: listAllUsers(db) });
}
