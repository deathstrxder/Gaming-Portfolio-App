import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "@/lib/db/schema";
import type { AppDb } from "@/lib/db";

/**
 * Shared scaffolding for exercising route handlers directly.
 *
 * Route handlers are where this project's security properties actually live —
 * the order of a rate-limit check against a bcrypt compare is a property of the
 * handler, not of any function it calls — so they are tested as handlers rather
 * than by extracting the logic somewhere more convenient and testing that.
 */
export async function freshDb(): Promise<AppDb> {
  const client = createClient({ url: ":memory:" });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db as AppDb;
}

interface StoredCookie {
  name: string;
  value: string;
}

/**
 * Minimal stand-in for the store `next/headers` cookies() returns.
 *
 * iron-session only needs get/set/delete against it, and Next's real
 * implementation is not constructible outside a request scope.
 */
export class FakeCookieStore {
  private jar = new Map<string, string>();

  get(name: string): StoredCookie | undefined {
    const value = this.jar.get(name);
    return value === undefined ? undefined : { name, value };
  }

  /**
   * Both call forms, because iron-session's CookieStore types `set` as an
   * overload — `(name, value, options?)` and `({ name, value, ... })`. Matching
   * the full shape is what lets this be passed without a cast, so the compiler
   * keeps checking that the fake still resembles the real store.
   */
  set(nameOrOptions: string | { name: string; value: string }, value?: string): void {
    if (typeof nameOrOptions === "string") {
      this.jar.set(nameOrOptions, value ?? "");
    } else {
      this.jar.set(nameOrOptions.name, nameOrOptions.value);
    }
  }

  delete(name: string): void {
    this.jar.delete(name);
  }

  has(name: string): boolean {
    return this.jar.has(name);
  }
}

/**
 * Seals a session into a fake cookie store, so a route under test sees an
 * authenticated caller. Uses the app's own session options rather than a
 * hand-rolled cookie, so a change to sealing or cookie naming breaks the tests
 * that depend on it instead of silently bypassing it.
 */
export async function signIn(
  store: FakeCookieStore,
  data: { userId: number; role?: "user" | "admin"; username?: string },
): Promise<void> {
  const { getIronSession } = await import("iron-session");
  const { baseSessionOptions } = await import("@/lib/auth/session");
  type SessionData = { userId: number; role: "user" | "admin"; username?: string };

  const session = await getIronSession<SessionData>(store, baseSessionOptions);
  session.userId = data.userId;
  session.role = data.role ?? "user";
  if (data.username) session.username = data.username;
  await session.save();
}

export function postJson(
  body: unknown,
  headers: Record<string, string> = {},
  url = "https://example.test/api",
): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}
