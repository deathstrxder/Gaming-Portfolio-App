import { z } from "zod";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";
import { parseUA } from "@/lib/analytics/ua";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  type: z.enum(["page_view", "section_view", "button_click", "dodecahedron_interaction"]),
  target: z.string().max(120).optional(),
  path: z.string().max(200).optional(),
  section: z.string().max(80).optional(),
  tz: z.string().max(64).optional(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400 });

  const { device, browser, os } = parseUA(request.headers.get("user-agent"));
  const session = await getSession();

  db.insert(events)
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

  return Response.json({ ok: true });
}
