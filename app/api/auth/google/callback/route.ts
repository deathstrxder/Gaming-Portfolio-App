import { cookies } from "next/headers";
import { decodeIdToken } from "arctic";
import { db } from "@/lib/db";
import { getGoogleClient } from "@/lib/auth/google";
import { resolveGoogleUser, getProfile } from "@/lib/db/users";
import { getSession, loginSessionOptions } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function redirectTo(path: string): Response {
  return new Response(null, { status: 302, headers: { Location: path } });
}

interface GoogleClaims {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
}

/**
 * Google's own error codes are lower-case identifiers (access_denied,
 * admin_policy_enforced, org_internal, …).
 *
 * The value is attacker-supplied — anyone can link to this endpoint with any
 * query string — and it gets reflected into a redirect, so only this shape is
 * echoed back. Anything else is reported generically rather than passed through.
 */
const GOOGLE_ERROR_CODE = /^[a-z_]{1,40}$/;

export async function GET(request: Request) {
  const jar = await cookies();
  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const storedState = jar.get("google_oauth_state")?.value;
  const codeVerifier = jar.get("google_oauth_code_verifier")?.value;

  // Always clear the one-time cookies, whatever happens next.
  jar.delete("google_oauth_state");
  jar.delete("google_oauth_code_verifier");

  // Google reports a refusal by redirecting here with ?error=<reason> and no
  // code. Falling through to the generic branch below would discard the only
  // thing that says WHY — turning "access_denied because the consent screen is
  // still in Testing mode and this account is not a test user" into an
  // unfalsifiable "Google sign-in failed. Please try again."
  const googleError = params.get("error");
  if (googleError) {
    console.error(
      `[google oauth] provider refused the sign-in: ${googleError}. ` +
        `access_denied usually means the OAuth consent screen is in Testing mode ` +
        `and this account is not listed as a test user.`,
    );
    const safe = GOOGLE_ERROR_CODE.test(googleError) ? googleError : "oauth";
    return redirectTo(`/?error=${safe}#support`);
  }

  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    return redirectTo("/?error=oauth#support");
  }

  let claims: GoogleClaims;
  try {
    const tokens = await getGoogleClient().validateAuthorizationCode(code, codeVerifier);
    claims = decodeIdToken(tokens.idToken()) as GoogleClaims;
  } catch {
    return redirectTo("/?error=oauth#support");
  }

  if (!claims.email || claims.email_verified === false) {
    return redirectTo("/?error=oauth#support");
  }

  try {
    const email = claims.email.toLowerCase();
    const { userId, outcome } = await resolveGoogleUser(db, { email, googleId: claims.sub });

    const profile = await getProfile(db, userId);
    const session = await getSession(loginSessionOptions(true)); // B1: 30-day persistent
    session.userId = userId;
    session.role = profile?.role ?? "user";
    session.username = profile?.username;
    await session.save();

    // A claim destroys a password, and the legitimate version of that is not
    // rare — it is what happens whenever a real user's verification mail went to
    // spam and they signed in with Google instead. Saying so beats letting them
    // discover it at the next sign-in.
    const claimed = outcome === "claimed";
    if (profile?.username) return redirectTo(claimed ? "/subscribe?claimed=1" : "/subscribe");
    return redirectTo(claimed ? "/?claimed=1#support" : "/#support");
  } catch {
    return redirectTo("/?error=oauth#support");
  }
}
