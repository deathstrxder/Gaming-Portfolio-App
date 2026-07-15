import { describe, it, expect, vi, afterEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { users } from "../db/schema";
import { generateCode, issueCode, verifyEmailCode } from "./codes";

function freshDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "drizzle" });
  const [u] = db.insert(users).values({ email: "u@t.com", passwordHash: "x" }).returning().all();
  return { db, userId: u.id };
}

afterEach(() => vi.useRealTimers());

describe("generateCode", () => {
  it("returns a 6-digit zero-padded string", () => {
    for (let i = 0; i < 50; i++) {
      const c = generateCode();
      expect(c).toMatch(/^\d{6}$/);
    }
  });
});

describe("issue/verify", () => {
  it("verifies a fresh code once, then rejects reuse", () => {
    const { db, userId } = freshDb();
    const code = issueCode(db, userId);
    expect(verifyEmailCode(db, userId, code)).toBe(true);
    expect(db.select().from(users).where(eq(users.id, userId)).get()!.emailVerified).toBe(true);
    expect(verifyEmailCode(db, userId, code)).toBe(false);
  });

  it("rejects a wrong code", () => {
    const { db, userId } = freshDb();
    issueCode(db, userId);
    expect(verifyEmailCode(db, userId, "000000")).toBe(false);
  });

  it("rejects an expired code", () => {
    const { db, userId } = freshDb();
    const code = issueCode(db, userId);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 11 * 60 * 1000);
    expect(verifyEmailCode(db, userId, code)).toBe(false);
  });

  it("issuing a new code invalidates the previous one", () => {
    const { db, userId } = freshDb();
    const first = issueCode(db, userId);
    const second = issueCode(db, userId);
    expect(verifyEmailCode(db, userId, first)).toBe(false);
    expect(verifyEmailCode(db, userId, second)).toBe(true);
  });
});
