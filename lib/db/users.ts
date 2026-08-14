import bcrypt from "bcryptjs";
import { desc, eq } from "drizzle-orm";
import type { AppDb } from "./index";
import { users, profiles } from "./schema";

export async function getUserByEmail(db: AppDb, email: string) {
  return db.select().from(users).where(eq(users.email, email)).get();
}

export async function getUserByGoogleId(db: AppDb, googleId: string) {
  return db.select().from(users).where(eq(users.googleId, googleId)).get();
}

export async function linkGoogleId(db: AppDb, userId: number, googleId: string): Promise<void> {
  await db.update(users).set({ googleId }).where(eq(users.id, userId)).run();
}

export async function createUserFromGoogle(
  db: AppDb,
  params: { email: string; googleId: string },
): Promise<{ userId: number }> {
  const [u] = await db
    .insert(users)
    .values({ email: params.email, googleId: params.googleId, emailVerified: true })
    .returning()
    .all();
  return { userId: u.id };
}

export type GoogleOutcome = "existing" | "linked" | "claimed" | "created";

/**
 * Hands an unverified account to the Google identity that proved it owns the
 * address, and destroys the password nobody proved anything with.
 */
export async function claimUnverifiedAccount(
  db: AppDb,
  userId: number,
  googleId: string,
): Promise<void> {
  await db
    .update(users)
    .set({ googleId, emailVerified: true, passwordHash: null })
    .where(eq(users.id, userId))
    .run();
}

/**
 * Resolves a Google sign-in to an account.
 *
 * The email branch is where account takeover used to live. Linking by email
 * alone meant an attacker could register victim@example.com, keep the password,
 * and wait: when the real owner signed in with Google they were dropped into
 * the attacker's account. The attacker never had to steal anything, only to
 * arrive first.
 *
 * The fix turns on who has actually demonstrated ownership of the address:
 *
 * - verified account -> link, keep the password. The legitimate case, where
 *   someone who already proved the address is theirs adds Google to it.
 * - unverified account -> claim it, and null the password hash.
 *
 * Refusing to link instead would have been worse than the bug: users.email is
 * UNIQUE, so a refusal makes the victim's Google sign-in fail forever on a
 * duplicate-email insert, converting a takeover into a permanent denial of
 * service against the same person.
 */
export async function resolveGoogleUser(
  db: AppDb,
  params: { email: string; googleId: string },
): Promise<{ userId: number; outcome: GoogleOutcome }> {
  const byGoogle = await getUserByGoogleId(db, params.googleId);
  if (byGoogle) return { userId: byGoogle.id, outcome: "existing" };

  const byEmail = await getUserByEmail(db, params.email);
  if (byEmail) {
    if (byEmail.emailVerified) {
      await linkGoogleId(db, byEmail.id, params.googleId);
      return { userId: byEmail.id, outcome: "linked" };
    }

    await claimUnverifiedAccount(db, byEmail.id, params.googleId);
    return { userId: byEmail.id, outcome: "claimed" };
  }

  const created = await createUserFromGoogle(db, params);
  return { userId: created.userId, outcome: "created" };
}

export async function setPassword(db: AppDb, userId: number, newPassword: string): Promise<void> {
  await db
    .update(users)
    .set({ passwordHash: bcrypt.hashSync(newPassword, 10) })
    .where(eq(users.id, userId))
    .run();
}

/**
 * `resent: true` means the account already existed and was never verified, so
 * the caller should issue and send a fresh code rather than refuse.
 *
 * Without that outcome a failed send is unrecoverable: the account exists, so
 * the retry returns email_taken, and the client only reaches the verify screen
 * after a successful signup. Given delivery through a third-party relay from a
 * gmail.com sender is expected to fail sometimes, that is the normal path
 * rather than an edge case.
 */
export type SignupOutcome =
  | { ok: true; userId: number; resent: boolean }
  | { ok: false; error: "email_taken" };

export async function createUnverifiedUser(
  db: AppDb,
  email: string,
  password: string,
): Promise<SignupOutcome> {
  const existing = await getUserByEmail(db, email);

  if (existing) {
    // Only an unverified PASSWORD account may be resumed. A verified account is
    // someone else's, and a null hash means a Google-owned account (both
    // createUserFromGoogle and the claim path set emailVerified, so this is
    // belt-and-braces rather than load-bearing).
    if (existing.emailVerified || existing.passwordHash === null) {
      return { ok: false, error: "email_taken" };
    }

    // Deliberately does NOT update the password. Anyone can post a known
    // address here, so accepting a new credential would turn this into a
    // password-reset oracle for accounts the caller does not control.
    return { ok: true, userId: existing.id, resent: true };
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const [u] = await db.insert(users).values({ email, passwordHash }).returning().all();
  return { ok: true, userId: u.id, resent: false };
}

/**
 * The bcrypt compare, split out from the lookup that precedes it.
 *
 * Callers need to interpose between "which account is this?" and "is the
 * password right?": the login route consumes the per-account rate limit in that
 * gap, so an exhausted budget short-circuits BEFORE spending ~100ms of a
 * 4 CPU-hour monthly allowance on a compare. Keeping the two joined inside
 * verifyCredentials left nowhere to put that check.
 */
export function verifyPassword(user: { passwordHash: string | null }, password: string): boolean {
  if (user.passwordHash === null) return false;
  return bcrypt.compareSync(password, user.passwordHash);
}

// verifyCredentials(db, email, password) used to live here, fusing the lookup
// and the compare. It was removed rather than left unused: it is a convenience
// that leaves NOWHERE to consume the per-account rate limit, so any future
// caller reaching for it would silently reinstate the compute-exhaustion path
// this branch closed. Resolve the account, consume the bucket, then call
// verifyPassword — see app/api/auth/login/route.ts.

export async function getProfile(db: AppDb, userId: number) {
  return db.select().from(profiles).where(eq(profiles.userId, userId)).get();
}

export async function setUsername(
  db: AppDb,
  userId: number,
  username: string,
  location?: string,
): Promise<{ ok: true } | { ok: false; error: "username_taken" }> {
  const taken = await db.select().from(profiles).where(eq(profiles.username, username)).get();
  if (taken && taken.userId !== userId) return { ok: false, error: "username_taken" };

  if (await getProfile(db, userId)) {
    await db.update(profiles).set({ username }).where(eq(profiles.userId, userId)).run();
  } else {
    await db.insert(profiles).values({ userId, username, location: location ?? null }).run();
  }
  return { ok: true };
}

export async function getUserById(db: AppDb, userId: number) {
  return db.select().from(users).where(eq(users.id, userId)).get();
}

export async function changePassword(
  db: AppDb,
  userId: number,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: "wrong_password" }> {
  const u = await getUserById(db, userId);
  if (!u || u.passwordHash === null || !bcrypt.compareSync(currentPassword, u.passwordHash)) {
    return { ok: false, error: "wrong_password" };
  }
  await db
    .update(users)
    .set({ passwordHash: bcrypt.hashSync(newPassword, 10) })
    .where(eq(users.id, userId))
    .run();
  return { ok: true };
}

/**
 * Marks an account verified without a code.
 *
 * Admin-only, and the reason it exists is that delivery is expected to fail
 * sometimes — see app/api/admin/users/verify/route.ts.
 */
export async function setEmailVerified(db: AppDb, userId: number): Promise<void> {
  await db.update(users).set({ emailVerified: true }).where(eq(users.id, userId)).run();
}

export async function setBirthday(db: AppDb, userId: number, birthday: string): Promise<void> {
  await db.update(profiles).set({ birthday }).where(eq(profiles.userId, userId)).run();
}

export async function deleteUser(db: AppDb, userId: number): Promise<void> {
  // profiles/verification_codes cascade; events.user_id is set null (FK rules).
  await db.delete(users).where(eq(users.id, userId)).run();
}

export async function listAllUsers(db: AppDb) {
  return db
    .select({
      userId: users.id,
      email: users.email,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
      username: profiles.username,
      location: profiles.location,
      birthday: profiles.birthday,
      subscriptionStatus: profiles.subscriptionStatus,
      subscriptionExpiresAt: profiles.subscriptionExpiresAt,
      role: profiles.role,
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .orderBy(desc(users.id))
    .all();
}

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
export type SubscriptionAction = "add" | "extend" | "shorten" | "remove";

export async function modifySubscription(
  db: AppDb,
  userId: number,
  action: SubscriptionAction,
  months = 1,
): Promise<void> {
  const p = await getProfile(db, userId);
  if (!p) return;
  const now = Date.now();
  let status: "none" | "active" | "canceled" = p.subscriptionStatus;
  let expires: number | null = p.subscriptionExpiresAt ? p.subscriptionExpiresAt.getTime() : null;

  if (action === "add") {
    status = "active";
    expires = now + months * MONTH_MS;
  } else if (action === "extend") {
    status = "active";
    expires = (expires && expires > now ? expires : now) + months * MONTH_MS;
  } else if (action === "shorten") {
    expires = (expires ?? now) - months * MONTH_MS;
    if (expires <= now) {
      expires = null;
      status = "canceled";
    }
  } else {
    status = "none";
    expires = null;
  }

  await db
    .update(profiles)
    .set({ subscriptionStatus: status, subscriptionExpiresAt: expires ? new Date(expires) : null })
    .where(eq(profiles.userId, userId))
    .run();
}
