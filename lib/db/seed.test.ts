import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { createClient, type Client } from "@libsql/client";
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

// One shared temp root for the whole file (not one mkdtemp per test) and one
// sweep at the very end, not per test -- see the afterAll comment below for
// why. Each test gets its own uniquely-named .db file inside it.
const testRoot = mkdtempSync(join(tmpdir(), "seed-test-db-"));
let dbCounter = 0;
const openClients: Client[] = [];

afterEach(() => {
  // Close every client this test opened, unconditionally -- correct hygiene
  // on its own regardless of whether it helps remove the file (measured: it
  // usually doesn't, see afterAll).
  while (openClients.length) openClients.pop()!.close();
});

afterAll(() => {
  try {
    rmSync(testRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  } catch (err) {
    // Measured during Task 5 review, with a standalone probe outside
    // vitest: on this Windows machine, a freshly-used local sqlite file
    // under @libsql/client is frequently NOT removable immediately after
    // client.close(), in every combination tried (with/without a
    // db.transaction, with/without an explicit close()). It is not a rare,
    // transient race -- closing the client is correct regardless, but does
    // not reliably make the file removable soon after. Sweeping once here
    // (instead of once per test, as before) only reduces how often this is
    // hit; it does not eliminate it. When removal fails, the OS reclaims
    // the temp directory on its own -- nothing in this repo depends on it
    // being removed synchronously.
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "EPERM" && code !== "EBUSY") throw err;
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
  const url = `file:${join(testRoot, `db-${dbCounter++}.db`).replace(/\\/g, "/")}`;
  const client = createClient({ url });
  openClients.push(client);
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
