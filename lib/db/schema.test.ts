import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import { users, profiles } from "./schema";

describe("schema", () => {
  it("migrates and round-trips a user and profile with correct defaults", () => {
    const sqlite = new Database(":memory:");
    sqlite.pragma("foreign_keys = ON");
    const db = drizzle(sqlite);
    migrate(db, { migrationsFolder: "drizzle" });

    const [u] = db
      .insert(users)
      .values({ email: "a@b.com", passwordHash: "x" })
      .returning()
      .all();
    expect(u.id).toBeGreaterThan(0);
    expect(u.emailVerified).toBe(false);

    db.insert(profiles).values({ userId: u.id, username: "neo" }).run();
    const p = db.select().from(profiles).where(eq(profiles.userId, u.id)).get();
    expect(p?.username).toBe("neo");
    expect(p?.role).toBe("user");
    expect(p?.subscriptionStatus).toBe("none");
    expect(p?.paymentAttempted).toBe(false);
  });
});
