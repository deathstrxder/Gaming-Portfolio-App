"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MemberChrome } from "./MemberChrome";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isPasswordValid } from "@/lib/auth/password";
import { PasswordChecklist } from "@/components/site/support/PasswordChecklist";

const inputClass =
  "w-full rounded-md border border-white/10 bg-bg/60 px-4 py-3 font-body text-ink " +
  "placeholder:text-muted/60 outline-none transition-colors focus:border-neon-blue focus:box-glow-blue";

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="hud-corners w-full max-w-md">
      <CardContent className="p-6">
        <h3 className="mb-4 font-display text-lg uppercase tracking-[0.15em] text-ink">{title}</h3>
        {children}
      </CardContent>
    </Card>
  );
}

export function AccountScreen() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [usernameMsg, setUsernameMsg] = useState<string | null>(null);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  const [birthday, setBirthday] = useState("");
  const [bdMsg, setBdMsg] = useState<string | null>(null);

  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function saveUsername(e: React.FormEvent) {
    e.preventDefault();
    const { ok, status } = await postJson("/api/auth/username", { username });
    setUsernameMsg(ok ? "Username updated." : status === 409 ? "That username is taken." : "3–20 letters, numbers, or underscores.");
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!isPasswordValid(next)) return setPwMsg("New password does not meet the requirements.");
    const { ok, status } = await postJson("/api/account/password", { currentPassword: current, newPassword: next });
    setPwMsg(ok ? "Password updated." : status === 403 ? "Current password is incorrect." : "Could not update password.");
    if (ok) { setCurrent(""); setNext(""); }
  }

  async function saveBirthday(e: React.FormEvent) {
    e.preventDefault();
    const { ok } = await postJson("/api/account/birthday", { birthday });
    setBdMsg(ok ? "Birthday saved." : "Enter a valid date.");
  }

  async function deleteAccount() {
    const { ok } = await postJson("/api/account/delete", {});
    if (ok) router.push("/");
  }

  return (
    <MemberChrome backHref="/subscribe">
      <div className="flex w-full max-w-md flex-col gap-6">
        <h2 className="text-center font-display text-4xl font-bold text-ink text-glow-blue">Account details</h2>

        <Section title="Change username">
          <form onSubmit={saveUsername} className="flex flex-col gap-3">
            <input className={inputClass} placeholder="New username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            {usernameMsg ? <p className="font-body text-sm text-muted">{usernameMsg}</p> : null}
            <Button type="submit" size="sm">Save username</Button>
          </form>
        </Section>

        <Section title="Change password">
          <form onSubmit={savePassword} className="flex flex-col gap-3">
            <input className={inputClass} type="password" placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
            <input className={inputClass} type="password" placeholder="New password" value={next} onChange={(e) => setNext(e.target.value)} required autoComplete="new-password" />
            <PasswordChecklist password={next} />
            {pwMsg ? <p className="font-body text-sm text-muted">{pwMsg}</p> : null}
            <Button type="submit" size="sm">Update password</Button>
          </form>
        </Section>

        <Section title="Birthday">
          <form onSubmit={saveBirthday} className="flex flex-col gap-3">
            <input className={inputClass} type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} required />
            {bdMsg ? <p className="font-body text-sm text-muted">{bdMsg}</p> : null}
            <Button type="submit" size="sm">Save birthday</Button>
          </form>
        </Section>

        <Section title="Delete account">
          {confirmingDelete ? (
            <div className="flex flex-col gap-3">
              <p className="font-body text-sm text-neon-purple">This permanently deletes your account. Are you sure?</p>
              <div className="flex gap-3">
                <Button type="button" variant="purple" size="sm" onClick={deleteAccount}>Yes, delete</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="purple" size="sm" onClick={() => setConfirmingDelete(true)}>Delete my account</Button>
          )}
        </Section>
      </div>
    </MemberChrome>
  );
}
