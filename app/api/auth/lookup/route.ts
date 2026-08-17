import { z } from "zod";
import { db } from "@/lib/db";
import { getUserByEmail } from "@/lib/db/users";
import { clientIp } from "@/lib/security/client-ip";
import { guard, LIMITS } from "@/lib/security/limits";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ email: z.string().email() });

/**
 * Answers whether an address already has an account, and whether that account
 * can accept a password at all.
 *
 * The unified auth panel asks one question — "what happens if I continue with
 * this address?" — and cannot branch between the sign-in screen and the signup
 * steps without the answer.
 *
 * That makes this an ACCOUNT-ENUMERATION ORACLE by construction, not by
 * oversight: the feature is "tell me whether I already have an account", so any
 * implementation of it tells the caller exactly that. It is accepted here for
 * the same reason the signup 409 already was — a personal site with one owner
 * and a handful of accounts, where the alternative (identical answers either
 * way) makes a mistyped address silently unrecoverable for a real user.
 *
 * The rate limit is the part that matters: it keeps this a way to confirm a few
 * guesses rather than to harvest a list.
 *
 * `hasPassword` is deliberately exposed too. It reveals that an account is
 * Google-only, which is a smaller fact than its existence, and it is what lets
 * the panel offer the Google button instead of a password field that could
 * never be accepted.
 */
export async function POST(request: Request) {
  const throttled = await guard(LIMITS.lookupIp, clientIp(request));
  if (throttled) return throttled;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400 });

  const user = await getUserByEmail(db, parsed.data.email.toLowerCase());

  // Only these two flags, ever. Everything else about the row — the hash, the
  // Google id, the verification state — stays server-side.
  return Response.json({
    exists: Boolean(user),
    hasPassword: Boolean(user?.passwordHash),
  });
}
