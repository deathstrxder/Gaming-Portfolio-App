import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { AdminDashboard } from "@/components/site/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if ((await requireAdmin()) === null) redirect("/");
  return <AdminDashboard />;
}
