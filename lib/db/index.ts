import { createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

export type AppDb = LibSQLDatabase<typeof schema>;

// Production points at Turso. With TURSO_DATABASE_URL unset, libSQL falls
// back to a local file so development and tests work offline, exactly as
// they did under better-sqlite3.
const url = process.env.TURSO_DATABASE_URL ?? `file:${process.env.DATABASE_PATH ?? "data/app.db"}`;

function createDb(): AppDb {
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  return drizzle(client, { schema });
}

// Reuse a single connection across dev hot-reloads.
const globalForDb = globalThis as unknown as { __db?: AppDb };
export const db = globalForDb.__db ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.__db = db;
