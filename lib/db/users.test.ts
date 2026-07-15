import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";
import { createUnverifiedUser, verifyCredentials, getProfile, setUsername } from "./users";

function freshDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "drizzle" });
  return db;
}

describe("createUnverifiedUser", () => {
  it("creates a user with a hashed password and rejects duplicate emails", () => {
    const db = freshDb();
    const res = createUnverifiedUser(db, "a@b.com", "Abc1!x");
    expect(res.ok).toBe(true);
    const dup = createUnverifiedUser(db, "a@b.com", "Abc1!x");
    expect(dup).toEqual({ ok: false, error: "email_taken" });
  });
});

describe("verifyCredentials", () => {
  it("returns the user for a correct password, null otherwise", () => {
    const db = freshDb();
    createUnverifiedUser(db, "a@b.com", "Abc1!x");
    expect(verifyCredentials(db, "a@b.com", "Abc1!x")).not.toBeNull();
    expect(verifyCredentials(db, "a@b.com", "wrong")).toBeNull();
    expect(verifyCredentials(db, "missing@b.com", "Abc1!x")).toBeNull();
  });
});

describe("setUsername", () => {
  it("creates a profile, then rejects a taken username", () => {
    const db = freshDb();
    const a = createUnverifiedUser(db, "a@b.com", "Abc1!x");
    const b = createUnverifiedUser(db, "b@b.com", "Abc1!x");
    if (!a.ok || !b.ok) throw new Error("setup failed");

    expect(setUsername(db, a.userId, "neo")).toEqual({ ok: true });
    expect(getProfile(db, a.userId)!.username).toBe("neo");
    expect(setUsername(db, b.userId, "neo")).toEqual({ ok: false, error: "username_taken" });
  });
});
