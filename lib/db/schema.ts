import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  googleId: text("google_id").unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const profiles = sqliteTable("profiles", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  username: text("username").notNull().unique(),
  birthday: text("birthday"),
  location: text("location"),
  subscriptionStatus: text("subscription_status", {
    enum: ["none", "active", "canceled"],
  })
    .notNull()
    .default("none"),
  subscriptionExpiresAt: integer("subscription_expires_at", { mode: "timestamp" }),
  role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
});

export const verificationCodes = sqliteTable("verification_codes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  consumed: integer("consumed", { mode: "boolean" }).notNull().default(false),
});

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  target: text("target"),
  path: text("path"),
  section: text("section"),
  device: text("device"),
  browser: text("browser"),
  os: text("os"),
  region: text("region"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/**
 * Fixed-window rate-limit counters.
 *
 * Raw unix seconds rather than `mode: "timestamp"`: the window boundary is
 * computed arithmetically and compared to the stored value inside a single
 * upsert, and routing that through Drizzle's Date mapper would put a
 * seconds/milliseconds conversion in the middle of it — the same class of bug
 * lib/db/analytics.ts already carries a warning about.
 *
 * One row per key, rewritten in place when its window rolls over, so the table
 * never grows beyond the number of live keys and needs no reaper. That property
 * only holds because entity-subject buckets are consumed after the entity is
 * known to exist; see lib/security/rate-limit.ts.
 */
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: integer("window_start").notNull(),
  count: integer("count").notNull(),
});
