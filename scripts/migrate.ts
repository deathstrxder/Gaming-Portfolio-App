import { runMigrations } from "../lib/db/migrate";

const dbPath = process.env.DATABASE_PATH || "data/app.db";
runMigrations(dbPath);
console.log("Migrations applied to", dbPath);
