import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { PayScreen } from "@/components/site/member/PayScreen";

export const dynamic = "force-dynamic";

export default async function PayPage() {
  const session = await getSession();
  if (!session.userId) redirect("/");
  return <PayScreen />;
}
