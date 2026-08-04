import { describe, it, expect, afterEach, afterAll } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runMigrations } from "./migrate";

const REAL_DRIZZLE_DIR = "drizzle";
const REBUILD_MIGRATION_TAG = "0003_lying_sunspot";

// One shared temp root for the whole file (not one mkdtemp per test) and one
// sweep at the very end, not per test -- see the afterAll comment below for
// why. Each caller of makeTempDir gets its own uniquely-named subdirectory.
const testRoot = mkdtempSync(join(tmpdir(), "migrate-fk-test-"));
let dirCounter = 0;
function makeTempDir(prefix: string): string {
  const dir = join(testRoot, `${prefix}${dirCounter++}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

// Every client opened anywhere in this file's test bodies is registered here
// so afterEach can close it unconditionally, even if a test throws midway
// and never reaches its own explicit .close() call.
const openClients: Client[] = [];
function openClient(url: string): Client {
  const client = createClient({ url });
  openClients.push(client);
  return client;
}
afterEach(() => {
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

/**
 * Builds a migrations folder containing only the migrations that predate the
 * 0003 users-table rebuild (the standard drizzle SQLite CREATE __new_x ->
 * INSERT ... SELECT -> DROP TABLE -> RENAME pattern that relaxed
 * `users.password_hash` to nullable). This lets the test bring a database up
 * to the pre-rebuild schema, seed it with real data -- exactly like a
 * populated production/dev database that had already been running before
 * Task 2 shipped -- and then apply the *real* remaining migrations
 * (including the rebuild) via `runMigrations`, the same function
 * `scripts/migrate.ts` calls in production.
 */
function buildPreRebuildMigrationsFolder(): string {
  const dir = makeTempDir("migrate-fk-test-subset-");
  mkdirSync(join(dir, "meta"), { recursive: true });
  const journal = JSON.parse(
    readFileSync(join(REAL_DRIZZLE_DIR, "meta", "_journal.json"), "utf8"),
  ) as { entries: { tag: string }[] };
  const rebuildIdx = journal.entries.findIndex((e) => e.tag === REBUILD_MIGRATION_TAG);
  // Fails loudly (rather than silently testing nothing) if the rebuild
  // migration is ever renamed, removed, or reordered.
  expect(rebuildIdx).toBeGreaterThan(-1);

  const preEntries = journal.entries.slice(0, rebuildIdx);
  writeFileSync(
    join(dir, "meta", "_journal.json"),
    JSON.stringify({ ...journal, entries: preEntries }),
  );
  for (const entry of preEntries) {
    writeFileSync(
      join(dir, `${entry.tag}.sql`),
      readFileSync(join(REAL_DRIZZLE_DIR, `${entry.tag}.sql`), "utf8"),
    );
  }
  return dir;
}

// A libSQL URL, not a filesystem path -- runMigrations now speaks the same
// URL scheme as lib/db/index.ts (":memory:", "file:...", "libsql://...").
// This test specifically needs a *file:* URL rather than ":memory:": it
// exercises three separate connections against the same database (seed
// pre-rebuild schema, seed data out-of-band, then apply the rebuild), and
// each connection to ":memory:" would start from a fresh, empty database,
// defeating the point of the test. A local file backs the same persistence
// semantics the real production Turso connection has.
function fileUrl(path: string): string {
  return `file:${path.replace(/\\/g, "/")}`;
}

async function rowCount(url: string, table: string): Promise<number> {
  const client = openClient(url);
  const rs = await client.execute(`SELECT COUNT(*) AS c FROM ${table}`);
  return Number(rs.rows[0].c);
}

describe("runMigrations", () => {
  it("does not cascade-delete profiles/verification_codes when the 0003 users-table rebuild runs against populated data", async () => {
    const dbDir = makeTempDir("migrate-fk-test-db-");
    const dbPath = join(dbDir, "test.db");
    const dbUrl = fileUrl(dbPath);
    const preRebuildDir = buildPreRebuildMigrationsFolder();

    // Phase 1: bring the DB up to the schema that existed right before the
    // rebuild migration -- mirrors an app that had already been running
    // pre-Task-2 (equivalent to the real dev/prod DB state).
    await runMigrations(dbUrl, preRebuildDir);

    // Phase 2: seed populated data the way the running app would have:
    // an admin with a profile, a second user with a profile and a pending
    // verification code, and an event referencing a user.
    const seedClient = openClient(dbUrl);
    const now = Date.now();
    await seedClient.execute({
      sql: `INSERT INTO users (id, email, password_hash, email_verified, created_at) VALUES (1, 'admin@x.local', 'hash1', 1, ?)`,
      args: [now],
    });
    await seedClient.execute({
      sql: `INSERT INTO users (id, email, password_hash, email_verified, created_at) VALUES (2, 'user@x.local', 'hash2', 0, ?)`,
      args: [now],
    });
    await seedClient.execute(`INSERT INTO profiles (user_id, username, role) VALUES (1, 'admin', 'admin')`);
    await seedClient.execute(`INSERT INTO profiles (user_id, username, role) VALUES (2, 'someone', 'user')`);
    await seedClient.execute({
      sql: `INSERT INTO verification_codes (user_id, code, expires_at) VALUES (2, '123456', ?)`,
      args: [now + 100_000],
    });
    await seedClient.execute({
      sql: `INSERT INTO events (user_id, type, created_at) VALUES (1, 'login', ?)`,
      args: [now],
    });

    const before = {
      users: await rowCount(dbUrl, "users"),
      profiles: await rowCount(dbUrl, "profiles"),
      verificationCodes: await rowCount(dbUrl, "verification_codes"),
      events: await rowCount(dbUrl, "events"),
    };
    expect(before).toEqual({ users: 2, profiles: 2, verificationCodes: 1, events: 1 });

    // Phase 3: the real production code path -- apply the remaining real
    // migrations (i.e. the 0003 rebuild) exactly as `npm run db:migrate`
    // would against a populated database.
    await runMigrations(dbUrl, REAL_DRIZZLE_DIR);

    const after = {
      users: await rowCount(dbUrl, "users"),
      profiles: await rowCount(dbUrl, "profiles"),
      verificationCodes: await rowCount(dbUrl, "verification_codes"),
      events: await rowCount(dbUrl, "events"),
    };
    const afterClient = openClient(dbUrl);
    const eventRs = await afterClient.execute(`SELECT user_id FROM events WHERE id = 1`);
    const eventUserId = eventRs.rows[0].user_id as number | null;

    // These would read profiles: 0, verificationCodes: 0, eventUserId: null
    // if FK enforcement were ON while the rebuild's DROP TABLE ran.
    expect(after.users).toBe(2);
    expect(after.profiles).toBe(2);
    expect(after.verificationCodes).toBe(1);
    expect(after.events).toBe(1);
    expect(eventUserId).toBe(1);
  });
});
