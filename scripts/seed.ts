import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { readFileSync } from "node:fs";
import { seedAdmin } from "../lib/db/seed";

// Load .env.local (tsx doesn't auto-load it) so ADMIN_PASSWORD and the Turso
// credentials are available.
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
} catch {
  // no .env.local — seedAdmin will throw a clear error if ADMIN_PASSWORD is unset
}

// Wrapped in main() rather than using top-level await: package.json has no
// "type": "module", so tsx transforms this file as CJS and a top-level await
// is a hard transform error. Matches the entry pattern in build-stats.ts.
async function main() {
  const url = process.env.TURSO_DATABASE_URL ?? `file:${process.env.DATABASE_PATH ?? "data/app.db"}`;
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  try {
    const res = await seedAdmin(drizzle(client));
    console.log(res.created ? "Admin account created." : "Admin already exists; skipped.");
  } finally {
    client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
