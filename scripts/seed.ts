import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { seedAdmin } from "../lib/db/seed";

const dbPath = process.env.DATABASE_PATH || "data/app.db";
const sqlite = new Database(dbPath);
sqlite.pragma("foreign_keys = ON");
const res = seedAdmin(drizzle(sqlite));
console.log(res.created ? "Admin account created." : "Admin already exists; skipped.");
sqlite.close();
