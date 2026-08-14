import { defineConfig } from "drizzle-kit";
import { resolveDbUrl } from "./lib/db/url";

export default defineConfig({
  dialect: "turso",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: resolveDbUrl(),
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
