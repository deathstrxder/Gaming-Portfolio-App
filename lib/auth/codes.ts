import { randomInt } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type { AppDb } from "../db";
import { verificationCodes, users } from "../db/schema";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

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
    .where(and(eq(verificationCodes.userId, userId), eq(verificationCodes.consumed, false)))
    .orderBy(desc(verificationCodes.id))
    .get();
  if (!row || row.expiresAt.getTime() < Date.now()) return false;

  if (row.code !== code) {
    const attempts = row.attempts + 1;
    db.update(verificationCodes)
      .set({ attempts, consumed: attempts >= MAX_ATTEMPTS })
      .where(eq(verificationCodes.id, row.id))
      .run();
    return false;
  }

  db.transaction((tx) => {
    tx.update(verificationCodes).set({ consumed: true }).where(eq(verificationCodes.id, row.id)).run();
    tx.update(users).set({ emailVerified: true }).where(eq(users.id, userId)).run();
  });
  return true;
}
