import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getUserById } from "@/lib/db/users";
import { AccountScreen } from "@/components/site/member/AccountScreen";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getSession();
  if (!session.userId) redirect("/");
  const user = getUserById(db, session.userId);
  return <AccountScreen hasPassword={user?.passwordHash != null} />;
}
