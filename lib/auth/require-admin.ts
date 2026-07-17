import { db } from "../db";
import { getProfile } from "../db/users";
import { getSession } from "./session";

// Returns the admin's userId, or null if the caller is not an admin.
// Re-reads role from the DB rather than trusting the cookie snapshot.
export async function requireAdmin(): Promise<number | null> {
  const session = await getSession();
  if (!session.userId) return null;
  const profile = getProfile(db, session.userId);
  return profile?.role === "admin" ? session.userId : null;
}
