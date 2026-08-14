import { sql } from "drizzle-orm";
import type { AppDb } from "@/lib/db";

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the current window rolls. Zero when admitted. */
  retryAfterSec: number;
}

interface ConsumeOptions {
  /** Injectable clock in unix SECONDS, so tests assert against fixed offsets. */
  now?: number;
  env?: Record<string, string | undefined>;
}

/**
 * Fixed-window boundary.
 *
 * Both layers below derive the boundary from this same arithmetic rather than
 * from when each first saw the key. An instance that anchored its own window to
 * first contact could still be mid-window when the shared window had already
 * rolled over, and would then reject a request the database would have admitted.
 */
export function windowStartFor(nowSec: number, windowSec: number): number {
  return Math.floor(nowSec / windowSec) * windowSec;
}

/**
 * Best-effort per-instance counter, in front of the database.
 *
 * Vercel gives no shared memory between invocations, so this can never be the
 * mechanism — only an optimisation that absorbs a burst arriving at one warm
 * instance. It is incremented ONLY when a request is admitted, which is what
 * keeps it a strict under-approximation of the true count: if this instance has
 * already seen `limit` admissions in the window, the real total is at least
 * `limit` too, so rejecting early can never reject someone the database would
 * have allowed.
 */
const memory = new Map<string, { windowStart: number; count: number }>();

export function resetMemory(): void {
  memory.clear();
}

function disabled(env: Record<string, string | undefined>): boolean {
  // Deliberately ignored in production. The hatch exists so the E2E suite does
  // not trip the limiter mid-run; if it were honoured in a deployed build, one
  // environment variable would silently disarm every limit in the app.
  if (env.NODE_ENV === "production") return false;
  return Boolean(env.RATE_LIMIT_DISABLED);
}

export async function consume(
  db: AppDb,
  bucket: string,
  subject: string,
  limit: number,
  windowSec: number,
  options: ConsumeOptions = {},
): Promise<RateLimitResult> {
  const env = options.env ?? process.env;
  if (disabled(env)) return { ok: true, retryAfterSec: 0 };

  const now = options.now ?? Math.floor(Date.now() / 1000);
  const windowStart = windowStartFor(now, windowSec);
  const retryAfterSec = windowStart + windowSec - now;
  const key = `${bucket}:${subject}`;

  const cached = memory.get(key);
  if (cached && cached.windowStart === windowStart && cached.count >= limit) {
    return { ok: false, retryAfterSec };
  }

  // Read before write. Rejected traffic is billed against reads (500M/month)
  // rather than writes (10M/month), so an over-limit caller costs essentially
  // nothing — without this the limiter would be a cheaper way to exhaust the
  // write quota than the abuse it exists to block.
  // `.all()[0]` rather than `.get()`: drizzle's libSQL driver runs a raw-SQL
  // `.get()` result through normalizeRow unconditionally, which throws
  // "Cannot convert undefined or null to object" when the query matched no
  // rows — i.e. on the very first request for any key. `.all()` returns an
  // empty array instead.
  const [existing] = await db.all<{ window_start: number; count: number }>(
    sql`SELECT window_start, count FROM rate_limits WHERE key = ${key}`,
  );
  if (existing && existing.window_start === windowStart && existing.count >= limit) {
    memory.set(key, { windowStart, count: existing.count });
    return { ok: false, retryAfterSec };
  }

  // Single statement, with the window roll-over folded into the upsert, so no
  // read-modify-write gap exists. Concurrent invocations are the normal case on
  // serverless, and a read-then-write counter silently admits over the limit.
  const [updated] = await db.all<{ count: number }>(
    sql`INSERT INTO rate_limits (key, window_start, count) VALUES (${key}, ${windowStart}, 1)
        ON CONFLICT(key) DO UPDATE SET
          count = CASE WHEN rate_limits.window_start = excluded.window_start
                       THEN rate_limits.count + 1 ELSE 1 END,
          window_start = excluded.window_start
        RETURNING count`,
  );

  const count = updated?.count ?? 1;
  memory.set(key, { windowStart, count });

  // A count above the limit here means several invocations cleared the read
  // simultaneously. Bounded by concurrency rather than by attack volume, and
  // rejecting is the conservative direction.
  if (count > limit) return { ok: false, retryAfterSec };
  return { ok: true, retryAfterSec: 0 };
}
