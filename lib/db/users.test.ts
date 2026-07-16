import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { users } from "./schema";
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
  listAllUsers,
  modifySubscription,
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

describe("credential guards for passwordless (Google-only) users", () => {
  it("verifyCredentials returns null when the account has no password", () => {
    const db = freshDb();
    db.insert(users).values({ email: "g@x.com", googleId: "google-1", emailVerified: true }).run();
    expect(verifyCredentials(db, "g@x.com", "anything")).toBeNull();
  });

  it("changePassword refuses when the account has no existing password", () => {
    const db = freshDb();
    const [u] = db
      .insert(users)
      .values({ email: "g@x.com", googleId: "google-1", emailVerified: true })
      .returning()
      .all();
    const res = changePassword(db, u.id, "whatever", "Abc1!xyz");
    expect(res).toEqual({ ok: false, error: "wrong_password" });
    // and the hash is still null (no password was set)
    const after = db.select().from(users).where(eq(users.id, u.id)).get();
    expect(after?.passwordHash).toBeNull();
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
    expect(bcrypt.compareSync("New1!pass", u.passwordHash!)).toBe(true);
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

describe("admin services", () => {
  it("listAllUsers returns joined rows without a password field", () => {
    const db = freshDb();
    const a = createUnverifiedUser(db, "a@b.com", "Abc1!x");
    if (!a.ok) throw new Error("setup");
    setUsername(db, a.userId, "neo");
    const rows = listAllUsers(db);
    expect(rows.length).toBe(1);
    expect(rows[0].email).toBe("a@b.com");
    expect(rows[0].username).toBe("neo");
    expect("passwordHash" in rows[0]).toBe(false);
  });

  it("modifySubscription add → active with a future expiry; remove → none", () => {
    const db = freshDb();
    const a = createUnverifiedUser(db, "a@b.com", "Abc1!x");
    if (!a.ok) throw new Error("setup");
    setUsername(db, a.userId, "neo");
    modifySubscription(db, a.userId, "add", 2);
    let p = getProfile(db, a.userId)!;
    expect(p.subscriptionStatus).toBe("active");
    expect(p.subscriptionExpiresAt!.getTime()).toBeGreaterThan(Date.now());
    modifySubscription(db, a.userId, "remove");
    p = getProfile(db, a.userId)!;
    expect(p.subscriptionStatus).toBe("none");
    expect(p.subscriptionExpiresAt).toBeNull();
  });
});
