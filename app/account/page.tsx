import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AccountScreen } from "@/components/site/member/AccountScreen";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getSession();
  if (!session.userId) redirect("/");
  return <AccountScreen />;
}
