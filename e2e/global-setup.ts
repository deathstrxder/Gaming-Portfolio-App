import path from "node:path";
import { runMigrations } from "../lib/db/migrate";

/**
 * Builds the throwaway database the E2E run writes to.
 *
 * Before this existed, a suite run inherited TURSO_DATABASE_URL from .env.local
 * and wrote its synthetic page_view rows straight into the PRODUCTION events
 * table — every spec loads `/`, and the analytics beacon fires on page view,
 * section view and click. The admin dashboard then reported test traffic as if
 * it were visitors.
 *
 * Migrating rather than recreating: `reuseExistingServer` means a dev server may
 * already be holding this file open, and deleting it underneath a live
 * connection is a worse failure than carrying a few stale rows in a local
 * scratch database. runMigrations is idempotent.
 */
export default async function globalSetup(): Promise<void> {
  const dbPath = path.join(__dirname, "..", "data", "e2e", "app.db");
  await runMigrations(`file:${dbPath}`);
}
