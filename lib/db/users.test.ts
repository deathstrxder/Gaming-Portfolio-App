import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";
import {
  createUnverifiedUser,
  verifyCredentials,
  getProfile,
  setUsername,
  getUserById,
  changePassword,
  setBirthday,
  deleteUser,
  recordPaymentAttempt,
} from "./users";

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

describe("account services", () => {
  it("changePassword rejects a wrong current password and updates on the right one", () => {
    const db = freshDb();
    const a = createUnverifiedUser(db, "a@b.com", "Abc1!x");
    if (!a.ok) throw new Error("setup");
    expect(changePassword(db, a.userId, "wrong", "New1!pass")).toEqual({ ok: false, error: "wrong_password" });
    expect(changePassword(db, a.userId, "Abc1!x", "New1!pass")).toEqual({ ok: true });
    const u = getUserById(db, a.userId)!;
    expect(bcrypt.compareSync("New1!pass", u.passwordHash)).toBe(true);
  });

  it("setBirthday and recordPaymentAttempt update the profile", () => {
    const db = freshDb();
    const a = createUnverifiedUser(db, "a@b.com", "Abc1!x");
    if (!a.ok) throw new Error("setup");
    setUsername(db, a.userId, "neo");
    setBirthday(db, a.userId, "1999-05-01");
    recordPaymentAttempt(db, a.userId, "4242", "Visa");
    const p = getProfile(db, a.userId)!;
    expect(p.birthday).toBe("1999-05-01");
    expect(p.paymentAttempted).toBe(true);
    expect(p.paymentLast4).toBe("4242");
    expect(p.paymentBrand).toBe("Visa");
  });

  it("deleteUser removes the user and cascades the profile", () => {
    const db = freshDb();
    const a = createUnverifiedUser(db, "a@b.com", "Abc1!x");
    if (!a.ok) throw new Error("setup");
    setUsername(db, a.userId, "neo");
    deleteUser(db, a.userId);
    expect(getUserById(db, a.userId)).toBeUndefined();
    expect(getProfile(db, a.userId)).toBeUndefined();
  });
});
