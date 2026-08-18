import { getSession } from "@/lib/auth/session";
import { clearPendingSignup } from "@/lib/auth/pending";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  session.destroy();

  // Also abandons a half-finished signup.
  //
  // The pending cookie is httpOnly and lives 15 minutes, and the panel resumes
  // the verify step from it after a reload — so without clearing it here, anyone
  // who gives up mid-signup is returned to the code screen on every visit for a
  // quarter of an hour, with no way off it. Signing out is the one action that
  // unambiguously means "I am done here", so it clears both.
  await clearPendingSignup();

  return Response.json({ ok: true });
}
