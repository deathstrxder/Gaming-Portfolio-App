import { describe, it, expect } from "vitest";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { users } from "./schema";
import {
  createUnverifiedUser,
  getUserByEmail,
  verifyPassword,
  getProfile,
  setUsername,
  getUserById,
  changePassword,
  setBirthday,
  deleteUser,
  listAllUsers,
  modifySubscription,
  resolveGoogleUser,
  setPassword,
} from "./users";

async function freshDb() {
  const client = createClient({ url: ":memory:" });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db;
}

describe("createUnverifiedUser", () => {
  it("creates a user with a hashed password", async () => {
    const db = await freshDb();
    const res = await createUnverifiedUser(db, "a@b.com", "Abc1!x");
    expect(res).toMatchObject({ ok: true, resent: false });
  });

  /**
   * Changed deliberately: this used to return email_taken for ANY duplicate.
   *
   * That made a failed verification email unrecoverable — the account exists,
   * so the retry was refused, and the client only reaches the verify screen
   * after a successful signup. Since mail is sent from a gmail.com address
   * through a relay that cannot align DMARC for it, a code landing in spam is
   * the expected case, so the dead end would have been reached routinely.
   */
  it("resumes an existing UNVERIFIED account so a fresh code can be sent", async () => {
    const db = await freshDb();
    const first = await createUnverifiedUser(db, "a@b.com", "Abc1!x");
    const again = await createUnverifiedUser(db, "a@b.com", "Abc1!x");

    expect(again).toMatchObject({ ok: true, resent: true });
    expect(again.ok && again.userId).toBe(first.ok && first.userId);
  });

  it("does not overwrite the password when resuming", async () => {
    const db = await freshDb();
    await createUnverifiedUser(db, "a@b.com", "Abc1!x");
    const before = (await getUserByEmail(db, "a@b.com"))!.passwordHash;

    await createUnverifiedUser(db, "a@b.com", "Different9!");

    // Anyone can post a known address here, so accepting a new credential
    // would make this a password-reset oracle for accounts the caller does
    // not control.
    expect((await getUserByEmail(db, "a@b.com"))!.passwordHash).toBe(before);
  });

  it("still refuses a duplicate once the account is verified", async () => {
    const db = await freshDb();
    const res = await createUnverifiedUser(db, "a@b.com", "Abc1!x");
    await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.id, res.ok ? res.userId : 0))
      .run();

    const dup = await createUnverifiedUser(db, "a@b.com", "Abc1!x");
    expect(dup).toEqual({ ok: false, error: "email_taken" });
  });
});

describe("verifyPassword", () => {
  it("accepts the right password and rejects everything else", async () => {
    const db = await freshDb();
    await createUnverifiedUser(db, "a@b.com", "Abc1!x");
    const user = (await getUserByEmail(db, "a@b.com"))!;

    expect(verifyPassword(user, "Abc1!x")).toBe(true);
    expect(verifyPassword(user, "wrong")).toBe(false);
  });

  /**
   * A Google-created or Google-claimed account has no hash. It must never
   * authenticate by password, and must not throw either — the login route
   * reaches this for any account it resolves.
   */
  it("rejects an account with no password hash", () => {
    expect(verifyPassword({ passwordHash: null }, "anything")).toBe(false);
  });
});

describe("credential guards for passwordless (Google-only) users", () => {
  it("a Google-only account never authenticates by password", async () => {
    const db = await freshDb();
    await db.insert(users).values({ email: "g@x.com", googleId: "google-1", emailVerified: true }).run();
    expect(verifyPassword((await getUserByEmail(db, "g@x.com"))!, "anything")).toBe(false);
  });

  it("changePassword refuses when the account has no existing password", async () => {
    const db = await freshDb();
    const [u] = await db
      .insert(users)
      .values({ email: "g@x.com", googleId: "google-1", emailVerified: true })
      .returning()
      .all();
    const res = await changePassword(db, u.id, "whatever", "Abc1!xyz");
    expect(res).toEqual({ ok: false, error: "wrong_password" });
    // and the hash is still null (no password was set)
    const after = await db.select().from(users).where(eq(users.id, u.id)).get();
    expect(after?.passwordHash).toBeNull();
  });
});

describe("setUsername", () => {
  it("creates a profile, then rejects a taken username", async () => {
    const db = await freshDb();
    const a = await createUnverifiedUser(db, "a@b.com", "Abc1!x");
    const b = await createUnverifiedUser(db, "b@b.com", "Abc1!x");
    if (!a.ok || !b.ok) throw new Error("setup failed");

    expect(await setUsername(db, a.userId, "neo")).toEqual({ ok: true });
    expect((await getProfile(db, a.userId))!.username).toBe("neo");
    expect(await setUsername(db, b.userId, "neo")).toEqual({ ok: false, error: "username_taken" });
  });
});

describe("account services", () => {
  it("changePassword rejects a wrong current password and updates on the right one", async () => {
    const db = await freshDb();
    const a = await createUnverifiedUser(db, "a@b.com", "Abc1!x");
    if (!a.ok) throw new Error("setup");
    expect(await changePassword(db, a.userId, "wrong", "New1!pass")).toEqual({ ok: false, error: "wrong_password" });
    expect(await changePassword(db, a.userId, "Abc1!x", "New1!pass")).toEqual({ ok: true });
    const u = (await getUserById(db, a.userId))!;
    expect(bcrypt.compareSync("New1!pass", u.passwordHash!)).toBe(true);
  });

  it("setBirthday updates the profile", async () => {
    const db = await freshDb();
    const a = await createUnverifiedUser(db, "a@b.com", "Abc1!x");
    if (!a.ok) throw new Error("setup");
    await setUsername(db, a.userId, "neo");
    await setBirthday(db, a.userId, "1999-05-01");
    const p = (await getProfile(db, a.userId))!;
    expect(p.birthday).toBe("1999-05-01");
  });

  it("deleteUser removes the user and cascades the profile", async () => {
    const db = await freshDb();
    const a = await createUnverifiedUser(db, "a@b.com", "Abc1!x");
    if (!a.ok) throw new Error("setup");
    await setUsername(db, a.userId, "neo");
    await deleteUser(db, a.userId);
    expect(await getUserById(db, a.userId)).toBeUndefined();
    expect(await getProfile(db, a.userId)).toBeUndefined();
  });
});

describe("resolveGoogleUser", () => {
  it("creates a new passwordless, verified user when nothing matches", async () => {
    const db = await freshDb();
    const res = await resolveGoogleUser(db, { email: "new@x.com", googleId: "g-new" });
    expect(res.outcome).toBe("created");
    const u = await getUserById(db, res.userId);
    expect(u?.email).toBe("new@x.com");
    expect(u?.googleId).toBe("g-new");
    expect(u?.emailVerified).toBe(true);
    expect(u?.passwordHash).toBeNull();
  });

  /**
   * The account-takeover fix.
   *
   * This case used to link and keep the password, which is what made
   * pre-registration an attack: register victim@example.com, hold the password,
   * and wait for the real owner to sign in with Google — they land in an
   * account whose password you know and keep.
   *
   * Google has proved the signer owns the address; whoever set that password
   * proved nothing. So the signer takes the account and the unproven credential
   * is destroyed.
   */
  it("CLAIMS an unverified password account, destroying its password", async () => {
    const db = await freshDb();
    const created = await createUnverifiedUser(db, "existing@x.com", "Abc1!xy");
    if (!created.ok) throw new Error("setup failed");

    const res = await resolveGoogleUser(db, { email: "existing@x.com", googleId: "g-claim" });

    expect(res.outcome).toBe("claimed");
    expect(res.userId).toBe(created.userId);

    const u = await getUserById(db, created.userId);
    expect(u?.googleId).toBe("g-claim");
    expect(u?.emailVerified).toBe(true);
    // Not data loss: a null hash routes the user into the existing Google-only
    // branch of /api/account/password, which sets an initial password with no
    // current password required.
    expect(u?.passwordHash).toBeNull();
  });

  it("links onto a VERIFIED password account and keeps its password", async () => {
    const db = await freshDb();
    const created = await createUnverifiedUser(db, "verified@x.com", "Abc1!xy");
    if (!created.ok) throw new Error("setup failed");
    await db.update(users).set({ emailVerified: true }).where(eq(users.id, created.userId)).run();
    const before = (await getUserById(db, created.userId))?.passwordHash;

    const res = await resolveGoogleUser(db, { email: "verified@x.com", googleId: "g-link" });

    // The legitimate case: a real user who owns the address adds Google to an
    // account they already proved was theirs. Their password must survive.
    expect(res.outcome).toBe("linked");
    expect(res.userId).toBe(created.userId);
    const u = await getUserById(db, created.userId);
    expect(u?.googleId).toBe("g-link");
    expect(u?.passwordHash).toBe(before);
  });

  it("returns the existing user when the googleId is already known", async () => {
    const db = await freshDb();
    const first = await resolveGoogleUser(db, { email: "again@x.com", googleId: "g-same" });
    const second = await resolveGoogleUser(db, { email: "again@x.com", googleId: "g-same" });
    expect(second.outcome).toBe("existing");
    expect(second.userId).toBe(first.userId);
  });
});

describe("setPassword", () => {
  it("sets a usable password on a previously passwordless account", async () => {
    const db = await freshDb();
    const { userId } = await resolveGoogleUser(db, { email: "g@x.com", googleId: "g-1" });
    await setPassword(db, userId, "Abc1!xyz");
    expect(verifyPassword((await getUserById(db, userId))!, "Abc1!xyz")).toBe(true);
  });
});

describe("admin services", () => {
  it("listAllUsers returns joined rows without a password field", async () => {
    const db = await freshDb();
    const a = await createUnverifiedUser(db, "a@b.com", "Abc1!x");
    if (!a.ok) throw new Error("setup");
    await setUsername(db, a.userId, "neo");
    const rows = await listAllUsers(db);
    expect(rows.length).toBe(1);
    expect(rows[0].email).toBe("a@b.com");
    expect(rows[0].username).toBe("neo");
    expect("passwordHash" in rows[0]).toBe(false);
  });

  it("modifySubscription add → active with a future expiry; remove → none", async () => {
    const db = await freshDb();
    const a = await createUnverifiedUser(db, "a@b.com", "Abc1!x");
    if (!a.ok) throw new Error("setup");
    await setUsername(db, a.userId, "neo");
    await modifySubscription(db, a.userId, "add", 2);
    let p = (await getProfile(db, a.userId))!;
    expect(p.subscriptionStatus).toBe("active");
    expect(p.subscriptionExpiresAt!.getTime()).toBeGreaterThan(Date.now());
    await modifySubscription(db, a.userId, "remove");
    p = (await getProfile(db, a.userId))!;
    expect(p.subscriptionStatus).toBe("none");
    expect(p.subscriptionExpiresAt).toBeNull();
  });
});
