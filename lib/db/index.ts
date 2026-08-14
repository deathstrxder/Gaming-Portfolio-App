import { createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema";
import { resolveDbUrl } from "./url";

export type AppDb = LibSQLDatabase<typeof schema>;

// Production points at Turso. With TURSO_DATABASE_URL unset OR BLANK, libSQL
// falls back to a local file so development, tests and the E2E harness work
// offline, exactly as they did under better-sqlite3. See lib/db/url.ts for why
// blank has to count as unset.
const url = resolveDbUrl();

function createDb(): AppDb {
  // libSQL creates the .db file for a file: URL but NOT its parent directory,
  // and createClient then throws SQLITE_CANTOPEN synchronously. Because `db`
  // below is initialised at module-import time, that surfaces as a crash on
  // first import with no hint that a missing directory caused it. `/data/` is
  // gitignored, so it need not exist on a fresh clone.
  if (url.startsWith("file:")) {
    const filePath = url.slice("file:".length).replace(/\?.*$/, "");
    mkdirSync(dirname(filePath), { recursive: true });
  }
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  return drizzle(client, { schema });
}

// Reuse a single connection across dev hot-reloads.
const globalForDb = globalThis as unknown as { __db?: AppDb };
export const db = globalForDb.__db ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.__db = db;
