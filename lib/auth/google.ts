import { Google } from "arctic";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const GOOGLE_SCOPES = ["openid", "email", "profile"];

/**
 * The exact string Google compares against the registered redirect URIs.
 *
 * Google matches these BYTE FOR BYTE, and reports any difference as a bare
 * "Error 400: redirect_uri_mismatch" that names nothing. A trailing slash on
 * APP_BASE_URL — trivially easy to paste into a dashboard field — produces
 * "https://site//api/auth/google/callback" and fails against a perfectly
 * correct registration, with no hint that one character is the cause.
 *
 * So the base is normalised here rather than trusted to be clean.
 */
export function googleRedirectUri(): string {
  const base = required("APP_BASE_URL").trim().replace(/\/+$/, "");
  return `${base}/api/auth/google/callback`;
}

// Build the client per call (not at module load) so a missing env var throws
// at request time inside the OAuth routes rather than crashing app startup,
// and so tests can set env before constructing.
export function getGoogleClient(): Google {
  return new Google(
    required("GOOGLE_CLIENT_ID"),
    required("GOOGLE_CLIENT_SECRET"),
    googleRedirectUri(),
  );
}
