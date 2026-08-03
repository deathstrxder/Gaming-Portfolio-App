import { createClient } from "@libsql/client";
import { count, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { readFileSync } from "node:fs";
import * as schema from "../lib/db/schema";
import { profiles, users } from "../lib/db/schema";

// Throwaway. Deleted once its findings are recorded — see Task 2 of
// docs/superpowers/plans/2026-07-29-vercel-turso-deploy.md.
//
// Reads TURSO_PROBE_URL / TURSO_PROBE_TOKEN rather than the production
// TURSO_DATABASE_URL / TURSO_AUTH_TOKEN names the plan suggested. Next.js
// auto-loads .env.local, and lib/db/index.ts prefers TURSO_DATABASE_URL over
// the local file, so using the production names here would silently point
// `npm run dev`, `db:migrate` and `db:seed` at this scratch database.
function loadEnvLocal() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim();
    }
  } catch {
    // no .env.local — the explicit check below reports the missing vars
  }
}

async function main() {
  loadEnvLocal();

  const url = process.env.TURSO_PROBE_URL;
  if (!url) {
    throw new Error("TURSO_PROBE_URL is not set. Add it to .env.local (see Task 2 Step 2).");
  }
  const client = createClient({ url, authToken: process.env.TURSO_PROBE_TOKEN });
  const db = drizzle(client, { schema });
  console.log("probing:", url.replace(/\?.*$/, ""));

  try {
    // Q1: do migrations apply cleanly to an empty remote database?
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("Q1 migrations: OK");

    // Q2: are foreign keys enforced by default? Insert a profile whose user_id
    // references a user that does not exist. If FKs are ON this throws.
    // Gates Task 4's deleteUser: the plain version relies on ON DELETE CASCADE.
    try {
      await db.insert(profiles).values({ userId: 999999, username: "orphan" }).run();
      console.log("Q2 foreign keys: NOT ENFORCED (orphan row was accepted)");
      await db.delete(profiles).where(eq(profiles.userId, 999999)).run();
    } catch {
      console.log("Q2 foreign keys: ENFORCED (orphan row was rejected)");
    }

    // Q3: do interactive transactions work against a remote database?
    // Gates Task 5's use of db.transaction over a db.batch fallback.
    try {
      await db.transaction(async (tx) => {
        const [u] = await tx.insert(users).values({ email: "probe@x.test" }).returning().all();
        await tx.insert(profiles).values({ userId: u.id, username: "probe" }).run();
      });
      console.log("Q3 transactions: OK");
    } catch (e) {
      console.log("Q3 transactions: FAILED —", (e as Error).message);
    }

    // Q4: does a query after a transaction still see the same database?
    // The local sqlite3 backend has a defect here — it drops its cached
    // connection after an interactive transaction, so a subsequent query
    // against a ":memory:" URL silently reopens an EMPTY database. Task 5 hit
    // this and worked around it with file: temp paths in tests. Confirm the
    // remote backend does not share it.
    const seen = await db.select({ n: count() }).from(users).get();
    console.log(
      "Q4 post-transaction connection reuse:",
      seen ? `OK (query returned n=${seen.n})` : "SUSPECT (query returned nothing)",
    );

    // Q5: what is the remote connection's foreign_keys pragma? Informational.
    // The migration-time FK hazard in lib/db/migrate.ts is handled procedurally
    // (Task 7 migrates while the DB is empty), so this does not block — but
    // record it, because it tells whoever writes the NEXT migration against
    // populated data whether the driver-level protection is actually present.
    const fk = await client.execute("PRAGMA foreign_keys");
    console.log("Q5 remote PRAGMA foreign_keys:", JSON.stringify(fk.rows[0]));

    // Clean up anything Q3 left behind, so Step 6 can assert an empty database.
    const probeUser = await db.select().from(users).where(eq(users.email, "probe@x.test")).get();
    if (probeUser) await db.delete(users).where(eq(users.id, probeUser.id)).run();
    await db.delete(profiles).where(eq(profiles.userId, 999999)).run();

    // Step 6, folded in: confirm the probe wrote no leftovers.
    const left = await client.execute("select count(*) as n from users");
    const orphans = await client.execute("select count(*) as n from profiles");
    console.log(`leftovers: users=${left.rows[0].n} profiles=${orphans.rows[0].n} (both should be 0)`);
  } finally {
    client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
