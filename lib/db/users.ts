import bcrypt from "bcryptjs";
import { desc, eq } from "drizzle-orm";
import type { AppDb } from "./index";
import { users, profiles } from "./schema";

export function getUserByEmail(db: AppDb, email: string) {
  return db.select().from(users).where(eq(users.email, email)).get();
}

export function createUnverifiedUser(
  db: AppDb,
  email: string,
  password: string,
): { ok: true; userId: number } | { ok: false; error: "email_taken" } {
  if (getUserByEmail(db, email)) return { ok: false, error: "email_taken" };
  const passwordHash = bcrypt.hashSync(password, 10);
  const [u] = db.insert(users).values({ email, passwordHash }).returning().all();
  return { ok: true, userId: u.id };
}

export function verifyCredentials(db: AppDb, email: string, password: string) {
  const u = getUserByEmail(db, email);
  if (!u) return null;
  return bcrypt.compareSync(password, u.passwordHash) ? u : null;
}

export function getProfile(db: AppDb, userId: number) {
  return db.select().from(profiles).where(eq(profiles.userId, userId)).get();
}

export function setUsername(
  db: AppDb,
  userId: number,
  username: string,
  location?: string,
): { ok: true } | { ok: false; error: "username_taken" } {
  const taken = db.select().from(profiles).where(eq(profiles.username, username)).get();
  if (taken && taken.userId !== userId) return { ok: false, error: "username_taken" };

  if (getProfile(db, userId)) {
    db.update(profiles).set({ username }).where(eq(profiles.userId, userId)).run();
  } else {
    db.insert(profiles).values({ userId, username, location: location ?? null }).run();
  }
  return { ok: true };
}

export function getUserById(db: AppDb, userId: number) {
  return db.select().from(users).where(eq(users.id, userId)).get();
}

export function changePassword(
  db: AppDb,
  userId: number,
  currentPassword: string,
  newPassword: string,
): { ok: true } | { ok: false; error: "wrong_password" } {
  const u = getUserById(db, userId);
  if (!u || !bcrypt.compareSync(currentPassword, u.passwordHash)) {
    return { ok: false, error: "wrong_password" };
  }
  db.update(users)
    .set({ passwordHash: bcrypt.hashSync(newPassword, 10) })
    .where(eq(users.id, userId))
    .run();
  return { ok: true };
}

export function setBirthday(db: AppDb, userId: number, birthday: string): void {
  db.update(profiles).set({ birthday }).where(eq(profiles.userId, userId)).run();
}

export function deleteUser(db: AppDb, userId: number): void {
  // profiles/verification_codes cascade; events.user_id is set null (FK rules).
  db.delete(users).where(eq(users.id, userId)).run();
}

export function recordPaymentAttempt(
  db: AppDb,
  userId: number,
  last4: string | null,
  brand: string,
): void {
  db.update(profiles)
    .set({ paymentAttempted: true, paymentLast4: last4, paymentBrand: brand })
    .where(eq(profiles.userId, userId))
    .run();
}

export function listAllUsers(db: AppDb) {
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
      paymentLast4: profiles.paymentLast4,
      paymentBrand: profiles.paymentBrand,
      paymentAttempted: profiles.paymentAttempted,
      role: profiles.role,
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .orderBy(desc(users.id))
    .all();
}

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
export type SubscriptionAction = "add" | "extend" | "shorten" | "remove";

export function modifySubscription(
  db: AppDb,
  userId: number,
  action: SubscriptionAction,
  months = 1,
): void {
  const p = getProfile(db, userId);
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

  db.update(profiles)
    .set({ subscriptionStatus: status, subscriptionExpiresAt: expires ? new Date(expires) : null })
    .where(eq(profiles.userId, userId))
    .run();
}
