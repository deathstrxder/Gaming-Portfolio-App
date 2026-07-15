import { describe, it, expect, beforeAll } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { seedAdmin } from "./seed";
import { users, profiles } from "./schema";
import { ADMIN_EMAIL, ADMIN_USERNAME } from "../auth/admin";

// Use an arbitrary test password so the real admin credential never appears
// in committed source (seedAdmin reads the value from ADMIN_PASSWORD).
const TEST_ADMIN_PASSWORD = "TestAdmin1!";
beforeAll(() => {
  process.env.ADMIN_PASSWORD = TEST_ADMIN_PASSWORD;
});

function freshDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: "drizzle" });
  return db;
}

describe("seedAdmin", () => {
  it("creates an admin user + profile with a hashed password", () => {
    const db = freshDb();
    const res = seedAdmin(db);
    expect(res.created).toBe(true);

    const u = db.select().from(users).where(eq(users.email, ADMIN_EMAIL)).get();
    expect(u).toBeDefined();
    expect(u!.emailVerified).toBe(true);
    // Password is hashed, not stored in plaintext.
    expect(u!.passwordHash).not.toBe(TEST_ADMIN_PASSWORD);
    expect(bcrypt.compareSync(TEST_ADMIN_PASSWORD, u!.passwordHash)).toBe(true);

    const p = db.select().from(profiles).where(eq(profiles.userId, u!.id)).get();
    expect(p!.username).toBe(ADMIN_USERNAME);
    expect(p!.role).toBe("admin");
  });

  it("is idempotent", () => {
    const db = freshDb();
    expect(seedAdmin(db).created).toBe(true);
    expect(seedAdmin(db).created).toBe(false);
    const all = db.select().from(users).all();
    expect(all.length).toBe(1);
  });
});
