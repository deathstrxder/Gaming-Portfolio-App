import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId: number;
  role: "user" | "admin";
  username?: string;
}

const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, in seconds

export const baseSessionOptions: SessionOptions = {
  password: process.env.IRON_SESSION_PASSWORD ?? "",
  cookieName: "eddie_session",
  // ttl 0 = no seal expiry, so the cookie's lifetime is governed SOLELY by
  // cookieOptions.maxAge below. (The iron-session default ttl of 14 days would
  // otherwise silently expire a 30-day "remember me" seal early.)
  ttl: 0,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Explicit `maxAge: undefined` (not just omitted) -> a session cookie
    // (browser clears it on close). iron-session's getSessionConfig() only
    // skips computing its own Max-Age when the "maxAge" key is present on
    // cookieOptions; if the key is absent entirely it derives one from ttl,
    // and ttl:0 is treated as "no expiry" -> Max-Age=2147483647 (~68 years),
    // which is NOT a session cookie. Keeping the key with an undefined value
    // makes the `cookie` package omit Max-Age/Expires from Set-Cookie.
    maxAge: undefined,
  },
};

// "Remember me" = a persistent cookie (30 days). Unchecked = the base options,
// i.e. a session cookie (no maxAge) the browser clears on close.
export function loginSessionOptions(remember: boolean): SessionOptions {
  if (!remember) return baseSessionOptions;
  return {
    ...baseSessionOptions,
    cookieOptions: { ...baseSessionOptions.cookieOptions, maxAge: REMEMBER_MAX_AGE },
  };
}

export async function getSession(
  options: SessionOptions = baseSessionOptions,
): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), options);
}
