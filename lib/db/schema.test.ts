import { describe, it, expect } from "vitest";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { users, profiles } from "./schema";

describe("schema", () => {
  it("migrates and round-trips a user and profile with correct defaults", async () => {
    const client = createClient({ url: ":memory:" });
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: "drizzle" });

    const [u] = await db
      .insert(users)
      .values({ email: "a@b.com", passwordHash: "x" })
      .returning()
      .all();
    expect(u.id).toBeGreaterThan(0);
    expect(u.emailVerified).toBe(false);

    await db.insert(profiles).values({ userId: u.id, username: "neo" }).run();
    const p = await db.select().from(profiles).where(eq(profiles.userId, u.id)).get();
    expect(p?.username).toBe("neo");
    expect(p?.role).toBe("user");
    expect(p?.subscriptionStatus).toBe("none");
  });
});
