import { getSession } from "@/lib/auth/session";
import { getPendingSignup } from "@/lib/auth/pending";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID);

  if (!session.userId) {
    // The auth panel lives in a section of the home page, so a refresh wipes its
    // React state and drops the user back at the address field — after a code
    // has already been emailed to them, which reads as "did that work?".
    //
    // Nothing client-side survives the reload, but the sealed pending-signup
    // cookie does, so this is the only place that can report "part-way through
    // verifying". Not sent once a session exists: there is nothing left to
    // verify then, and a stale id would send a signed-in user to a code screen.
    const pendingUserId = await getPendingSignup();
    return Response.json({ user: null, googleEnabled, pendingUserId });
  }

  return Response.json({
    user: { userId: session.userId, role: session.role, username: session.username ?? null },
    googleEnabled,
  });
}
