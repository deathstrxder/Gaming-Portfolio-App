import { cookies } from "next/headers";
import { generateState, generateCodeVerifier } from "arctic";
import { getGoogleClient, GOOGLE_SCOPES } from "@/lib/auth/google";

export const dynamic = "force-dynamic";

const TEMP_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 10, // 10 minutes
};

export async function GET() {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  let url: URL;
  try {
    url = getGoogleClient().createAuthorizationURL(state, codeVerifier, GOOGLE_SCOPES);
  } catch {
    return new Response(null, { status: 302, headers: { Location: "/?error=oauth#support" } });
  }

  const jar = await cookies();
  jar.set("google_oauth_state", state, TEMP_COOKIE_OPTS);
  jar.set("google_oauth_code_verifier", codeVerifier, TEMP_COOKIE_OPTS);

  return new Response(null, { status: 302, headers: { Location: url.href } });
}
