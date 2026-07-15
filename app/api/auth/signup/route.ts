import { z } from "zod";
import { db } from "@/lib/db";
import { createUnverifiedUser } from "@/lib/db/users";
import { issueCode } from "@/lib/auth/codes";
import { isPasswordValid } from "@/lib/auth/password";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ email: z.string().email(), password: z.string().max(200) });

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_input" }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  if (!isPasswordValid(parsed.data.password)) {
    return Response.json({ error: "weak_password" }, { status: 400 });
  }

  const res = createUnverifiedUser(db, email, parsed.data.password);
  if (!res.ok) return Response.json({ error: res.error }, { status: 409 });

  const code = issueCode(db, res.userId);
  return Response.json({ userId: res.userId, code }, { status: 201 });
}
