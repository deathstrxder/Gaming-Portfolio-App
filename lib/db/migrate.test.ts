import { describe, it, expect, afterEach } from "vitest";
import Database from "better-sqlite3";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runMigrations } from "./migrate";

const REAL_DRIZZLE_DIR = "drizzle";
const REBUILD_MIGRATION_TAG = "0003_lying_sunspot";

const tempDirs: string[] = [];
function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}
afterEach(() => {
  while (tempDirs.length) rmSync(tempDirs.pop()!, { recursive: true, force: true });
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

function rowCount(sqlite: Database.Database, table: string): number {
  return (sqlite.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number }).c;
}

describe("runMigrations", () => {
  it("does not cascade-delete profiles/verification_codes when the 0003 users-table rebuild runs against populated data", () => {
    const dbDir = makeTempDir("migrate-fk-test-db-");
    const dbPath = join(dbDir, "test.db");
    const preRebuildDir = buildPreRebuildMigrationsFolder();

    // Phase 1: bring the DB up to the schema that existed right before the
    // rebuild migration -- mirrors an app that had already been running
    // pre-Task-2 (equivalent to the real dev/prod DB state).
    runMigrations(dbPath, preRebuildDir);

    // Phase 2: seed populated data the way the running app would have:
    // an admin with a profile, a second user with a profile and a pending
    // verification code, and an event referencing a user.
    const seedDb = new Database(dbPath);
    seedDb.pragma("foreign_keys = ON");
    const now = Date.now();
    seedDb
      .prepare(
        `INSERT INTO users (id, email, password_hash, email_verified, created_at) VALUES (1, 'admin@x.local', 'hash1', 1, ?)`,
      )
      .run(now);
    seedDb
      .prepare(
        `INSERT INTO users (id, email, password_hash, email_verified, created_at) VALUES (2, 'user@x.local', 'hash2', 0, ?)`,
      )
      .run(now);
    seedDb.prepare(`INSERT INTO profiles (user_id, username, role) VALUES (1, 'admin', 'admin')`).run();
    seedDb.prepare(`INSERT INTO profiles (user_id, username, role) VALUES (2, 'someone', 'user')`).run();
    seedDb
      .prepare(`INSERT INTO verification_codes (user_id, code, expires_at) VALUES (2, '123456', ?)`)
      .run(now + 100_000);
    seedDb.prepare(`INSERT INTO events (user_id, type, created_at) VALUES (1, 'login', ?)`).run(now);

    const before = {
      users: rowCount(seedDb, "users"),
      profiles: rowCount(seedDb, "profiles"),
      verificationCodes: rowCount(seedDb, "verification_codes"),
      events: rowCount(seedDb, "events"),
    };
    seedDb.close();
    expect(before).toEqual({ users: 2, profiles: 2, verificationCodes: 1, events: 1 });

    // Phase 3: the real production code path -- apply the remaining real
    // migrations (i.e. the 0003 rebuild) exactly as `npm run db:migrate`
    // would against a populated database.
    runMigrations(dbPath, REAL_DRIZZLE_DIR);

    const afterDb = new Database(dbPath);
    const after = {
      users: rowCount(afterDb, "users"),
      profiles: rowCount(afterDb, "profiles"),
      verificationCodes: rowCount(afterDb, "verification_codes"),
      events: rowCount(afterDb, "events"),
    };
    const eventUserId = (
      afterDb.prepare(`SELECT user_id FROM events WHERE id = 1`).get() as { user_id: number | null }
    ).user_id;
    afterDb.close();

    // These would read profiles: 0, verificationCodes: 0, eventUserId: null
    // if FK enforcement were ON while the rebuild's DROP TABLE ran.
    expect(after.users).toBe(2);
    expect(after.profiles).toBe(2);
    expect(after.verificationCodes).toBe(1);
    expect(after.events).toBe(1);
    expect(eventUserId).toBe(1);
  });
});
