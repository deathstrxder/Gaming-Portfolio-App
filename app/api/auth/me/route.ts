import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID);
  if (!session.userId) return Response.json({ user: null, googleEnabled });
  return Response.json({
    user: { userId: session.userId, role: session.role, username: session.username ?? null },
    googleEnabled,
  });
}
