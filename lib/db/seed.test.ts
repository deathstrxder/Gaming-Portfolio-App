import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { seedAdmin } from "./seed";
import * as schema from "./schema";
import { users, profiles } from "./schema";
import { ADMIN_EMAIL, ADMIN_USERNAME } from "../auth/admin";

// Use an arbitrary test password so the real admin credential never appears
// in committed source (seedAdmin reads the value from ADMIN_PASSWORD).
const TEST_ADMIN_PASSWORD = "TestAdmin1!";
beforeAll(() => {
  process.env.ADMIN_PASSWORD = TEST_ADMIN_PASSWORD;
});

const tempDirs: string[] = [];
afterEach(() => {
  while (tempDirs.length) {
    const dir = tempDirs.pop()!;
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    } catch (err) {
      // See the identical comment in migrate.test.ts: a transient Windows
      // file lock on a just-closed local sqlite file must not fail the
      // suite over best-effort temp-dir cleanup.
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "EPERM" && code !== "EBUSY") throw err;
    }
  }
});

// `:memory:` cannot be used here. @libsql/client's local sqlite3 backend
// (lib-esm/sqlite3.js, Sqlite3Client#transaction) discards its cached native
// connection when an interactive transaction starts, so the *next* query on
// this same `db` lazily reopens a fresh connection. Reopening a real file
// sees the same data; reopening ":memory:" always yields a brand-new, empty
// database. seedAdmin runs its insert through db.transaction, so any
// follow-up query on `db` in these tests would otherwise fail with
// "no such table: users" -- confirmed by running this against a literal
// ":memory:" URL. A real (temp) file reproduces the same reconnect
// semantics a production file:/libsql:// connection has.
async function freshDb() {
  const dir = mkdtempSync(join(tmpdir(), "seed-test-db-"));
  tempDirs.push(dir);
  const url = `file:${join(dir, "test.db").replace(/\\/g, "/")}`;
  const client = createClient({ url });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db;
}

describe("seedAdmin", () => {
  it("creates an admin user + profile with a hashed password", async () => {
    const db = await freshDb();
    const res = await seedAdmin(db);
    expect(res.created).toBe(true);

    const u = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL)).get();
    expect(u).toBeDefined();
    expect(u!.emailVerified).toBe(true);
    // Password is hashed, not stored in plaintext.
    expect(u!.passwordHash).not.toBe(TEST_ADMIN_PASSWORD);
    expect(bcrypt.compareSync(TEST_ADMIN_PASSWORD, u!.passwordHash!)).toBe(true);

    const p = await db.select().from(profiles).where(eq(profiles.userId, u!.id)).get();
    expect(p!.username).toBe(ADMIN_USERNAME);
    expect(p!.role).toBe("admin");
  });

  it("is idempotent", async () => {
    const db = await freshDb();
    expect((await seedAdmin(db)).created).toBe(true);
    expect((await seedAdmin(db)).created).toBe(false);
    const all = await db.select().from(users).all();
    expect(all.length).toBe(1);
  });
});
