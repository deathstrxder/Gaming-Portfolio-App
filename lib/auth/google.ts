import { Google } from "arctic";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const GOOGLE_SCOPES = ["openid", "email", "profile"];

export function googleRedirectUri(): string {
  return `${required("APP_BASE_URL")}/api/auth/google/callback`;
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
