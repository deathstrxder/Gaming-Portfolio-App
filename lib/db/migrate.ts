import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

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
 * OFF. A remote Turso connection offers no equivalent guarantee, so the
 * mitigation is now procedural: migrations are applied to the production
 * database while it is EMPTY, before any user data exists (see the plan's
 * Task 7). A rebuild on an empty table destroys nothing.
 *
 * Before running any FUTURE migration against a populated database, take a
 * Turso backup first and verify row counts afterwards.
 */
export async function runMigrations(url: string, migrationsFolder = "drizzle"): Promise<void> {
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  await migrate(drizzle(client), { migrationsFolder });
  client.close();
}
