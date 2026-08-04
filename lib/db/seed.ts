import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { users, profiles } from "./schema";
import { ADMIN_EMAIL, ADMIN_USERNAME } from "../auth/admin";

export async function seedAdmin<TSchema extends Record<string, unknown>>(
  db: LibSQLDatabase<TSchema>,
): Promise<{ created: boolean }> {
  const existing = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL)).get();
  if (existing) return { created: false };

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD env var is required to seed the admin account.");
  }

  const passwordHash = bcrypt.hashSync(adminPassword, 10);
  await db.transaction(async (tx) => {
    const [u] = await tx
      .insert(users)
      .values({ email: ADMIN_EMAIL, passwordHash, emailVerified: true })
      .returning()
      .all();
    await tx
      .insert(profiles)
      .values({ userId: u.id, username: ADMIN_USERNAME, role: "admin", location: "—" })
      .run();
  });
  return { created: true };
}
