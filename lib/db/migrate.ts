import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Applies pending drizzle migrations to the SQLite database at `dbPath`.
 *
 * Migrations must run with FK enforcement OFF on this connection. Drizzle's
 * better-sqlite3 migrator wraps ALL pending migration files in a single
 * BEGIN/COMMIT transaction, and SQLite ignores `PRAGMA foreign_keys` changes
 * while a transaction is open -- so a `PRAGMA foreign_keys=OFF/ON` pair
 * emitted *inside* a migration file (e.g. drizzle's standard SQLite table
 * rebuild: CREATE __new_x -> INSERT ... SELECT FROM x -> DROP TABLE x ->
 * RENAME __new_x TO x, as used by migration 0003 to relax a NOT NULL
 * constraint) is a no-op there.
 *
 * If FK enforcement is ON at the connection level when that transaction
 * starts, `DROP TABLE x` performs an implicit delete of every row in x,
 * which cascades: ON DELETE CASCADE children are wiped and ON DELETE SET
 * NULL children get their reference nulled. This is exactly what migration
 * 0003's users-table rebuild did to `profiles` / `verification_codes` (and
 * nulled `events.user_id`) before this fix. Setting the connection's FK
 * pragma to OFF here -- on the migration path only -- prevents that.
 *
 * The app runtime connection (lib/db/index.ts) intentionally keeps FKs ON
 * for normal operation; do not change that to "fix" this.
 */
export function runMigrations(dbPath: string, migrationsFolder = "drizzle"): void {
  mkdirSync(dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("foreign_keys = OFF");
  migrate(drizzle(sqlite), { migrationsFolder });
  sqlite.close();
}
