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

  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    return redirectTo("/?error=oauth");
  }

  let claims: GoogleClaims;
  try {
    const tokens = await getGoogleClient().validateAuthorizationCode(code, codeVerifier);
    claims = decodeIdToken(tokens.idToken()) as GoogleClaims;
  } catch {
    return redirectTo("/?error=oauth");
  }

  if (!claims.email || claims.email_verified === false) {
    return redirectTo("/?error=oauth");
  }

  const email = claims.email.toLowerCase();
  const { userId } = resolveGoogleUser(db, { email, googleId: claims.sub });

  const profile = getProfile(db, userId);
  const session = await getSession(loginSessionOptions(true)); // B1: 30-day persistent
  session.userId = userId;
  session.role = profile?.role ?? "user";
  session.username = profile?.username;
  await session.save();

  return redirectTo(profile?.username ? "/subscribe" : "/");
}
