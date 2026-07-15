import { randomInt } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { AppDb } from "../db";
import { verificationCodes, users } from "../db/schema";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function issueCode(db: AppDb, userId: number): string {
  db.update(verificationCodes)
    .set({ consumed: true })
    .where(and(eq(verificationCodes.userId, userId), eq(verificationCodes.consumed, false)))
    .run();

  const code = generateCode();
  db.insert(verificationCodes)
    .values({ userId, code, expiresAt: new Date(Date.now() + CODE_TTL_MS) })
    .run();
  return code;
}

export function verifyEmailCode(db: AppDb, userId: number, code: string): boolean {
  const row = db
    .select()
    .from(verificationCodes)
    .where(
      and(
        eq(verificationCodes.userId, userId),
        eq(verificationCodes.code, code),
        eq(verificationCodes.consumed, false),
      ),
    )
    .get();
  if (!row || row.expiresAt.getTime() < Date.now()) return false;

  db.transaction((tx) => {
    tx.update(verificationCodes).set({ consumed: true }).where(eq(verificationCodes.id, row.id)).run();
    tx.update(users).set({ emailVerified: true }).where(eq(users.id, userId)).run();
  });
  return true;
}
