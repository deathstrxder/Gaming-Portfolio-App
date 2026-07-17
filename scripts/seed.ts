import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { seedAdmin } from "../lib/db/seed";
import { readFileSync } from "node:fs";

// Load .env.local (tsx doesn't auto-load it) so ADMIN_PASSWORD is available.
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
} catch {
  // no .env.local — seedAdmin will throw a clear error if ADMIN_PASSWORD is unset
}

const dbPath = process.env.DATABASE_PATH || "data/app.db";
mkdirSync(dirname(dbPath), { recursive: true });
const sqlite = new Database(dbPath);
sqlite.pragma("foreign_keys = ON");
const res = seedAdmin(drizzle(sqlite));
console.log(res.created ? "Admin account created." : "Admin already exists; skipped.");
sqlite.close();
