import { z } from "zod";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { parseUA, isBot } from "@/lib/analytics/ua";
import { clientIp } from "@/lib/security/client-ip";
import { guard, LIMITS } from "@/lib/security/limits";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  type: z.enum(["page_view", "section_view", "button_click", "dodecahedron_interaction"]),
  target: z.string().max(120).optional(),
  path: z.string().max(200).optional(),
  section: z.string().max(80).optional(),
  tz: z.string().max(64).optional(),
});

/**
 * Unauthenticated by necessity — the dashboard's whole purpose is measuring
 * anonymous visitors — so every POST here is one row write against a
 * 10,000,000-per-month budget, and pollutes the only analytics the site has.
 *
 * The checks run cheapest-and-most-certain first: origin -> bot -> rate limit
 * -> insert. That order is a design decision, not a style: the rate-limit check
 * is the only step that touches the database, so putting the two free header
 * checks ahead of it means crawler and cross-site traffic is discarded without
 * spending a read, and without consuming limit budget that belongs to real
 * visitors sharing an address. It is asserted by tests for that reason.
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400 });

  // 1. Origin. Free, and stops cross-site and casual scripted noise. Trivially
  //    spoofable by anyone setting the header deliberately, so it is not
  //    credited with more than that. An ABSENT origin is allowed: keepalive
  //    beacons on unload do not reliably send one, and a real visitor's last
  //    page view should not be the price of this check.
  const origin = request.headers.get("origin");
  const expected = process.env.APP_BASE_URL;
  if (origin && expected && origin !== expected) {
    return Response.json({ error: "bad_origin" }, { status: 403 });
  }

  // 2. Crawlers. Also free, and this is what keeps the E2E suite from eating
  //    rate-limit budget, since headless Chromium identifies itself here.
  const ua = request.headers.get("user-agent");
  if (isBot(ua)) return Response.json({ ok: true, recorded: false });

  // 3. Rate limit. First step that costs anything.
  const throttled = await guard(LIMITS.eventsIp, clientIp(request));
  if (throttled) return throttled;

  const { device, browser, os } = parseUA(ua);
  const session = await getSession();

  await db.insert(events)
    .values({
      userId: session.userId ?? null,
      type: parsed.data.type,
      target: parsed.data.target ?? null,
      path: parsed.data.path ?? null,
      section: parsed.data.section ?? null,
      device,
      browser,
      os,
      region: parsed.data.tz ?? null,
    })
    .run();

  // `recorded` distinguishes "stored" from "accepted but dropped", so the two
  // outcomes are not both reported as a bare ok:true.
  return Response.json({ ok: true, recorded: true });
}
