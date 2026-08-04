import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Applies pending drizzle migrations to the libSQL database at `url`.
 *
 * Historical note, still relevant: drizzle's migrator wraps ALL pending
 * migration files in a single transaction, and SQLite ignores
 * `PRAGMA foreign_keys` changes while a transaction is open. If FK
 * enforcement is ON when that transaction starts, the table-rebuild pattern
 * drizzle emits for SQLite (CREATE __new_x -> INSERT ... SELECT -> DROP
 * TABLE x -> RENAME) makes `DROP TABLE x` cascade-delete every child row.
 * Migration 0003 rebuilds `users` and would wipe `profiles` /
 * `verification_codes` and null `events.user_id`.
 *
 * Under better-sqlite3 this was avoided by setting the connection pragma to
 * OFF by hand. That protection still exists, but it moved into the driver:
 * drizzle's libSQL migrator routes through `client.migrate()`, which brackets
 * the migration transaction with `PRAGMA foreign_keys=off` / `=on` itself.
 * Verified in @libsql/client's local sqlite3 backend during Task 5's review.
 * Whether the remote hrana/HTTP backend does the same is confirmed by the
 * Task 2 probe.
 *
 * The procedural mitigation is therefore defence-in-depth rather than the
 * only protection: migrations are applied to the production database while it
 * is EMPTY, before any user data exists (see Task 7). A rebuild on an empty
 * table destroys nothing either way.
 *
 * Before running any FUTURE migration against a populated database, take a
 * Turso backup first and verify row counts afterwards.
 *
 * The app runtime connection (lib/db/index.ts) intentionally keeps FKs ON for
 * normal operation; do not change that to "fix" anything here.
 */
export async function runMigrations(url: string, migrationsFolder = "drizzle"): Promise<void> {
  // Self-sufficient for file: URLs: libSQL creates the .db file but not its
  // parent directory, and this function's callers (scripts/migrate.ts) do not
  // import lib/db/index.ts, so nothing else creates it. /data/ is gitignored.
  if (url.startsWith("file:")) {
    const filePath = url.slice("file:".length).replace(/\?.*$/, "");
    mkdirSync(dirname(filePath), { recursive: true });
  }
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  try {
    await migrate(drizzle(client), { migrationsFolder });
  } finally {
    client.close();
  }
}
