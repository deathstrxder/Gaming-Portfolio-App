import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
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
  paymentLast4: text("payment_last4"),
  paymentBrand: text("payment_brand"),
  paymentAttempted: integer("payment_attempted", { mode: "boolean" })
    .notNull()
    .default(false),
  role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
});

export const verificationCodes = sqliteTable("verification_codes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
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
