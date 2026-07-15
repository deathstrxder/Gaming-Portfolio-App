import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  session.destroy();
  return Response.json({ ok: true });
}
