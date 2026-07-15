import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { users, profiles } from "./schema";
import { ADMIN_EMAIL, ADMIN_USERNAME } from "../auth/admin";

export function seedAdmin<TSchema extends Record<string, unknown>>(
  db: BetterSQLite3Database<TSchema>,
): { created: boolean } {
  const existing = db
    .select()
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))
    .get();
  if (existing) return { created: false };

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD env var is required to seed the admin account.");
  }

  const passwordHash = bcrypt.hashSync(adminPassword, 10);
  db.transaction((tx) => {
    const [u] = tx
      .insert(users)
      .values({ email: ADMIN_EMAIL, passwordHash, emailVerified: true })
      .returning()
      .all();
    tx.insert(profiles)
      .values({ userId: u.id, username: ADMIN_USERNAME, role: "admin", location: "—" })
      .run();
  });
  return { created: true };
}
