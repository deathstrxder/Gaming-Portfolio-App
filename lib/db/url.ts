/**
 * Resolves the libSQL connection URL from the environment.
 *
 * This lived as a copy-pasted `??` expression in four places — lib/db/index.ts,
 * drizzle.config.ts, scripts/migrate.ts and scripts/seed.ts — which meant the
 * blank-string trap below had to be got right four times.
 *
 * `??` falls back only on null/undefined, so an EMPTY TURSO_DATABASE_URL counts
 * as "set" and hands a blank URL to createClient, which throws at import time
 * rather than falling back to the local file. That matters because Playwright's
 * `webServer.env` merges with the parent environment and offers no way to unset
 * an inherited variable, so an empty string is the only lever the E2E harness
 * has for "ignore Turso, use a local file". Treating blank as unset is what
 * makes that lever work.
 */
export function resolveDbUrl(env: Record<string, string | undefined> = process.env): string {
  const turso = env.TURSO_DATABASE_URL?.trim();
  if (turso) return turso;

  const path = env.DATABASE_PATH?.trim() || "data/app.db";
  return `file:${path}`;
}
