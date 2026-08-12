import { db } from "@/lib/db";
import { getTraffic } from "@/lib/db/analytics";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isRangeKey } from "@/lib/analytics/ranges";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if ((await requireAdmin()) === null) return Response.json({ error: "forbidden" }, { status: 403 });

  // Absent means the default range; present-but-unknown is an error rather than
  // a silent fall back, since quietly answering a different question than the
  // one asked is worse than refusing.
  const raw = new URL(request.url).searchParams.get("range");
  if (raw !== null && !isRangeKey(raw)) {
    return Response.json({ error: `unknown range "${raw}"` }, { status: 400 });
  }

  return Response.json(await getTraffic(db, raw ?? "week"));
}
