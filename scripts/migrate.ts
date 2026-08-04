import { readFileSync } from "node:fs";
import { runMigrations } from "../lib/db/migrate";

// Load .env.local (tsx doesn't auto-load it) so Turso credentials are available.
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
} catch {
  // no .env.local — fall through to the local file default
}

// Wrapped in main() rather than using top-level await: package.json has no
// "type": "module", so tsx transforms this file as CJS and a top-level await
// is a hard transform error. Matches the entry pattern in build-stats.ts.
async function main() {
  const url = process.env.TURSO_DATABASE_URL ?? `file:${process.env.DATABASE_PATH ?? "data/app.db"}`;
  await runMigrations(url);
  console.log("Migrations applied to", url.replace(/\?.*$/, ""));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
