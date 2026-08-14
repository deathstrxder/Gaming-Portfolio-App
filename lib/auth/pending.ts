import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

/**
 * The pending-signup handle.
 *
 * Resend needs to know WHICH signup is being resent, and taking that from the
 * request body would make the endpoint an email-bombing vector: user ids are
 * small sequential integers, so a caller could walk 1..N and mail a real code
 * to every registered address, harassing users and draining a 300-per-day
 * allowance until signup stops working for everyone.
 *
 * Binding it to a sealed, httpOnly cookie means a caller can only resend a
 * signup they actually started.
 *
 * Sealed with iron-session under its own cookie name rather than a bespoke
 * HMAC: the dependency is already here and already configured with a rotated
 * secret, and a second hand-rolled signing scheme is how signing schemes get
 * written wrong.
 */
export interface PendingSignup {
  userId: number;
}

const PENDING_TTL_SEC = 60 * 15;

export const pendingOptions: SessionOptions = {
  password: process.env.IRON_SESSION_PASSWORD ?? "",
  cookieName: "eddie_pending",
  ttl: PENDING_TTL_SEC,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PENDING_TTL_SEC,
  },
};

export async function setPendingSignup(userId: number): Promise<void> {
  const pending = await getIronSession<PendingSignup>(await cookies(), pendingOptions);
  pending.userId = userId;
  await pending.save();
}

export async function getPendingSignup(): Promise<number | null> {
  const pending = await getIronSession<PendingSignup>(await cookies(), pendingOptions);
  return pending.userId ?? null;
}

export async function clearPendingSignup(): Promise<void> {
  const pending = await getIronSession<PendingSignup>(await cookies(), pendingOptions);
  pending.destroy();
}
