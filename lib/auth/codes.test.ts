import { describe, it, expect, vi, afterEach, afterAll } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { eq } from "drizzle-orm";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as schema from "../db/schema";
import { users } from "../db/schema";
import { generateCode, issueCode, verifyEmailCode } from "./codes";

// One shared temp root for the whole file (not one mkdtemp per test) and one
// sweep at the very end, not per test -- see the afterAll comment below for
// why. Each test gets its own uniquely-named .db file inside it.
const testRoot = mkdtempSync(join(tmpdir(), "codes-test-db-"));
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
// discards its cached native connection when an interactive transaction
// starts (see the comment in lib/db/seed.test.ts's freshDb for the exact
// mechanism), so any query on this same `db` issued after a successful
// verifyEmailCode call -- which commits through db.transaction -- would
// otherwise reopen a fresh, empty ":memory:" database and fail with
// "no such table: users". A real (temp) file reproduces the same reconnect
// semantics a production file:/libsql:// connection has.
async function freshDb() {
  const url = `file:${join(testRoot, `db-${dbCounter++}.db`).replace(/\\/g, "/")}`;
  const client = createClient({ url });
  openClients.push(client);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  const [u] = await db.insert(users).values({ email: "u@t.com", passwordHash: "x" }).returning().all();
  return { db, userId: u.id };
}

afterEach(() => vi.useRealTimers());

describe("generateCode", () => {
  it("returns a 6-digit zero-padded string", () => {
    for (let i = 0; i < 50; i++) {
      const c = generateCode();
      expect(c).toMatch(/^\d{6}$/);
    }
  });
});

describe("issue/verify", () => {
  it("verifies a fresh code once, then rejects reuse", async () => {
    const { db, userId } = await freshDb();
    const code = await issueCode(db, userId);
    expect(await verifyEmailCode(db, userId, code)).toBe(true);
    expect((await db.select().from(users).where(eq(users.id, userId)).get())!.emailVerified).toBe(true);
    expect(await verifyEmailCode(db, userId, code)).toBe(false);
  });

  it("rejects a wrong code", async () => {
    const { db, userId } = await freshDb();
    await issueCode(db, userId);
    expect(await verifyEmailCode(db, userId, "000000")).toBe(false);
  });

  it("rejects an expired code", async () => {
    const { db, userId } = await freshDb();
    const code = await issueCode(db, userId);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 11 * 60 * 1000);
    expect(await verifyEmailCode(db, userId, code)).toBe(false);
  });

  it("issuing a new code invalidates the previous one", async () => {
    const { db, userId } = await freshDb();
    const first = await issueCode(db, userId);
    const second = await issueCode(db, userId);
    expect(await verifyEmailCode(db, userId, first)).toBe(false);
    expect(await verifyEmailCode(db, userId, second)).toBe(true);
  });

  it("locks the code after too many wrong attempts", async () => {
    const { db, userId } = await freshDb();
    const code = await issueCode(db, userId);
    for (let i = 0; i < 5; i++) expect(await verifyEmailCode(db, userId, "000001")).toBe(false);
    // the code is now invalidated even though the correct code is supplied
    expect(await verifyEmailCode(db, userId, code)).toBe(false);
  });
});
