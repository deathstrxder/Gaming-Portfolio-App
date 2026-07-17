import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { SubscribeScreen } from "@/components/site/member/SubscribeScreen";

export const dynamic = "force-dynamic";

export default async function SubscribePage() {
  const session = await getSession();
  if (!session.userId) redirect("/");
  return <SubscribeScreen />;
}
