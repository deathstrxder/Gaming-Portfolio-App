import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { users, profiles } from "./schema";
import { ADMIN_EMAIL, ADMIN_USERNAME } from "../auth/admin";

// The admin password is intentionally defined here, in a server-only module
// that no client component imports, so it never ships to the browser bundle.
const ADMIN_PASSWORD = "Bobbynumber1!";

export function seedAdmin(
  db: BetterSQLite3Database<Record<string, never>>,
): { created: boolean } {
  const existing = db
    .select()
    .from(users)
    .where(eq(users.email, ADMIN_EMAIL))
    .get();
  if (existing) return { created: false };

  const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
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
