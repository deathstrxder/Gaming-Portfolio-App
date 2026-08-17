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
  } catch (error) {
    console.error(`[google oauth] cannot start sign-in: ${(error as Error).message}`);
    return new Response(null, { status: 302, headers: { Location: "/?error=oauth#support" } });
  }

  // The single most useful line for diagnosing "Error 400: redirect_uri_mismatch".
  //
  // Google compares this against the registered URIs byte for byte and reports a
  // mismatch without ever saying what it received, so the only way to fix one is
  // to know exactly what was sent. Logging it means the value can be copied
  // straight from the platform logs into the Google Cloud console, rather than
  // reconstructed by hand from APP_BASE_URL and hopefully got right.
  console.log(`[google oauth] redirect_uri sent: ${url.searchParams.get("redirect_uri")}`);

  const jar = await cookies();
  jar.set("google_oauth_state", state, TEMP_COOKIE_OPTS);
  jar.set("google_oauth_code_verifier", codeVerifier, TEMP_COOKIE_OPTS);

  return new Response(null, { status: 302, headers: { Location: url.href } });
}
