import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
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
