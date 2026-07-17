"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarList, type Row } from "./Bar";

type Tab = "traffic" | "analytics" | "users";

interface Traffic {
  totalVisits: number;
  uniqueVisitors: number;
  byDevice: Row[];
  byBrowser: Row[];
  byOs: Row[];
  byRegion: Row[];
  byPath: Row[];
}
interface Analytics {
  mostViewedSections: Row[];
  mostPressedButtons: Row[];
  dodecahedronInteractions: number;
  topPages: Row[];
}
interface AdminUser {
  userId: number;
  email: string;
  username: string | null;
  location: string | null;
  birthday: string | null;
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
  paymentLast4: string | null;
  paymentBrand: string | null;
  paymentAttempted: boolean;
  role: string;
}

async function getJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url);
  return res.ok ? ((await res.json()) as T) : null;
}
async function postJson(url: string, body: unknown) {
  await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="hud-corners">
      <CardContent className="p-6">
        <p className="font-display text-5xl font-black text-neon-blue text-glow-blue">{value}</p>
        <p className="mt-1 font-body text-sm uppercase tracking-[0.15em] text-muted">{label}</p>
      </CardContent>
    </Card>
  );
}

export function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("traffic");
  const [traffic, setTraffic] = useState<Traffic | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);

  async function refreshUsers() {
    const d = await getJson<{ users: AdminUser[] }>("/api/admin/users");
    setUsers(d?.users ?? []);
  }

  useEffect(() => {
    getJson<Traffic>("/api/admin/traffic").then(setTraffic);
    getJson<Analytics>("/api/admin/analytics").then(setAnalytics);
    getJson<{ users: AdminUser[] }>("/api/admin/users").then((d) => setUsers(d?.users ?? []));
  }, []);

  async function del(userId: number) {
    await postJson("/api/admin/users/delete", { userId });
    refreshUsers();
  }
  async function sub(userId: number, action: string) {
    await postJson("/api/admin/users/subscription", { userId, action, months: 1 });
    refreshUsers();
  }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "traffic", label: "Website Traffic" },
    { id: "analytics", label: "Data Analytics" },
    { id: "users", label: "User Details" },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-white/10 bg-bg-elev/60 p-6">
        <p className="mb-8 font-display text-lg uppercase tracking-[0.2em] text-neon-purple text-glow-purple">Admin</p>
        <nav className="flex flex-col gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-md px-4 py-2 text-left font-body text-sm transition-colors ${
                tab === t.id ? "bg-neon-blue/15 text-neon-blue" : "text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <Button variant="ghost" size="sm" className="mt-8" onClick={logout}>Log out</Button>
      </aside>

      <main className="flex-1 overflow-x-auto p-8">
        {tab === "traffic" && traffic ? (
          <div className="flex flex-col gap-8">
            <h1 className="font-display text-4xl font-bold text-ink text-glow-blue">Website Traffic</h1>
            <div className="grid grid-cols-2 gap-4 sm:max-w-md">
              <Stat label="Page views" value={traffic.totalVisits} />
              <Stat label="Registered visitors" value={traffic.uniqueVisitors} />
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <BarList title="Where (timezone)" rows={traffic.byRegion} />
              <BarList title="Device" rows={traffic.byDevice} />
              <BarList title="Browser" rows={traffic.byBrowser} />
              <BarList title="OS" rows={traffic.byOs} />
              <BarList title="Top pages" rows={traffic.byPath} />
            </div>
          </div>
        ) : null}

        {tab === "analytics" && analytics ? (
          <div className="flex flex-col gap-8">
            <h1 className="font-display text-4xl font-bold text-ink text-glow-blue">Data Analytics</h1>
            <div className="sm:max-w-xs">
              <Stat label="Dodecahedron interactions" value={analytics.dodecahedronInteractions} />
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <BarList title="Most viewed sections" rows={analytics.mostViewedSections} />
              <BarList title="Most pressed buttons" rows={analytics.mostPressedButtons} />
              <BarList title="Top pages" rows={analytics.topPages} />
            </div>
          </div>
        ) : null}

        {tab === "users" && users ? (
          <div className="flex flex-col gap-6">
            <h1 className="font-display text-4xl font-bold text-ink text-glow-blue">User Details</h1>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left font-body text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-muted">
                    <th className="p-2">Email</th>
                    <th className="p-2">Username</th>
                    <th className="p-2">Password</th>
                    <th className="p-2">Region</th>
                    <th className="p-2">Birthday</th>
                    <th className="p-2">Payment</th>
                    <th className="p-2">Subscription</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.userId} className="border-b border-white/5 text-ink">
                      <td className="p-2">{u.email}</td>
                      <td className="p-2">{u.username ?? "—"}{u.role === "admin" ? " ⭑" : ""}</td>
                      <td className="p-2 text-muted/60">hashed — not viewable</td>
                      <td className="p-2">{u.location ?? "—"}</td>
                      <td className="p-2">{u.birthday ?? "—"}</td>
                      <td className="p-2">{u.paymentAttempted ? `${u.paymentBrand ?? "Card"} ••${u.paymentLast4 ?? "????"}` : "—"}</td>
                      <td className="p-2">
                        {u.subscriptionStatus}
                        {u.subscriptionExpiresAt ? <span className="block text-muted/60">until {new Date(u.subscriptionExpiresAt).toLocaleDateString()}</span> : null}
                      </td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          <button onClick={() => sub(u.userId, "add")} className="rounded bg-neon-blue/15 px-2 py-1 text-xs text-neon-blue">+Add</button>
                          <button onClick={() => sub(u.userId, "extend")} className="rounded bg-neon-blue/10 px-2 py-1 text-xs text-neon-blue">Extend</button>
                          <button onClick={() => sub(u.userId, "shorten")} className="rounded bg-white/5 px-2 py-1 text-xs text-muted">Shorten</button>
                          <button onClick={() => sub(u.userId, "remove")} className="rounded bg-white/5 px-2 py-1 text-xs text-muted">Remove</button>
                          {u.role !== "admin" ? (
                            <button onClick={() => del(u.userId)} className="rounded bg-neon-purple/15 px-2 py-1 text-xs text-neon-purple">Delete</button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
