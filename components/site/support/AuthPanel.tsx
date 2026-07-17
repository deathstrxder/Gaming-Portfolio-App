"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isPasswordValid } from "@/lib/auth/password";
import { PasswordChecklist } from "./PasswordChecklist";

type Step = "loading" | "signup" | "login" | "verify" | "username" | "done";

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

function GoogleAuthOptions() {
  return (
    <>
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-white/10" aria-hidden="true" />
        <span className="font-body text-xs uppercase tracking-[0.2em] text-muted">or</span>
        <span className="h-px flex-1 bg-white/10" aria-hidden="true" />
      </div>
      <Button asChild variant="ghost">
        <a href="/api/auth/google">Continue with Google</a>
      </Button>
    </>
  );
}

export function AuthPanel() {
  const [step, setStep] = useState<Step>("loading");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [remember, setRemember] = useState(false);

  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [shownCode, setShownCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user && d.user.username) {
          setDisplayName(d.user.username);
          setRole(d.user.role);
          setStep("done");
        } else if (d.user) {
          setStep("username");
        } else {
          setStep("signup");
        }
      })
      .catch(() => setStep("signup"));
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("error") === "oauth") {
        setError("Google sign-in failed. Please try again.");
        window.history.replaceState({}, "", window.location.pathname);
      }
    });
  }, []);

  function fail(msg: string) {
    setError(msg);
    setBusy(false);
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isPasswordValid(password)) return fail("Password does not meet the requirements.");
    if (password !== confirm) return fail("Passwords do not match.");
    setBusy(true);
    const { ok, status, data } = await postJson("/api/auth/signup", { email, password });
    if (!ok) return fail(status === 409 ? "That email is already registered." : "Invalid email or password.");
    setPendingUserId(data.userId);
    setShownCode(data.code);
    setBusy(false);
    setStep("verify");
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { ok, data } = await postJson("/api/auth/verify", { userId: pendingUserId, code });
    if (!ok) return fail("That code is incorrect or expired.");
    setBusy(false);
    if (data.username) {
      router.push("/subscribe");
    } else {
      setStep("username");
    }
  }

  async function handleUsername(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { ok, status } = await postJson("/api/auth/username", { username });
    if (!ok) return fail(status === 409 ? "That username is taken." : "Usernames are 3–20 letters, numbers, or underscores.");
    setBusy(false);
    router.push("/subscribe");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { ok, status, data } = await postJson("/api/auth/login", {
      identifier,
      password: loginPassword,
      remember,
    });
    if (!ok) {
      return fail(status === 403 ? "Please verify your email first." : "Incorrect email or password.");
    }
    setBusy(false);
    if (data.username) {
      router.push(data.role === "admin" ? "/admin" : "/subscribe");
    } else {
      setStep("username");
    }
  }

  async function handleLogout() {
    await postJson("/api/auth/logout", {});
    setDisplayName(null);
    setPassword("");
    setConfirm("");
    setLoginPassword("");
    setStep("signup");
  }

  return (
    <Card className="hud-corners box-glow-purple">
      <CardContent className="p-8">
        {error ? (
          <p className="mb-4 rounded-md border border-neon-purple/40 bg-neon-purple/10 px-4 py-2 font-body text-sm text-neon-purple">
            {error}
          </p>
        ) : null}

        {step === "loading" ? (
          <p className="text-center font-body text-muted">Loading…</p>
        ) : null}

        {step === "signup" ? (
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <h3 className="font-display text-2xl uppercase tracking-[0.15em] text-ink">Create account</h3>
            <input className={inputClass} type="email" placeholder="Email" value={email}
              onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            <input className={inputClass} type="password" placeholder="Password" value={password}
              onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
            <PasswordChecklist password={password} />
            <input className={inputClass} type="password" placeholder="Confirm password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
            <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Sign up"}</Button>
            <GoogleAuthOptions />
            <button type="button" className="font-body text-sm text-muted underline underline-offset-4 hover:text-neon-blue"
              onClick={() => { setError(null); setStep("login"); }}>
              Already have an account? Login instead!
            </button>
          </form>
        ) : null}

        {step === "login" ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <h3 className="font-display text-2xl uppercase tracking-[0.15em] text-ink">Log in</h3>
            <input className={inputClass} type="text" placeholder="Email" value={identifier}
              onChange={(e) => setIdentifier(e.target.value)} required autoComplete="username" />
            <input className={inputClass} type="password" placeholder="Password" value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)} required autoComplete="current-password" />
            <label className="flex items-center gap-2 font-body text-sm text-muted">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember me
            </label>
            <Button type="submit" disabled={busy}>{busy ? "Logging in…" : "Log in"}</Button>
            <GoogleAuthOptions />
            <button type="button" className="font-body text-sm text-muted underline underline-offset-4 hover:text-neon-blue"
              onClick={() => { setError(null); setStep("signup"); }}>
              Need an account? Sign up instead!
            </button>
          </form>
        ) : null}

        {step === "verify" ? (
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <h3 className="font-display text-2xl uppercase tracking-[0.15em] text-ink">Verify your email</h3>
            <p className="font-body text-sm text-muted">
              Enter the 6-digit code. (Email delivery is simulated for this demo — your code is:)
            </p>
            <p className="text-center font-display text-3xl tracking-[0.4em] text-neon-blue text-glow-blue">
              {shownCode}
            </p>
            <input className={`${inputClass} text-center tracking-[0.4em]`} inputMode="numeric" maxLength={6}
              placeholder="______" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required />
            <Button type="submit" disabled={busy}>{busy ? "Verifying…" : "Verify"}</Button>
          </form>
        ) : null}

        {step === "username" ? (
          <form onSubmit={handleUsername} className="flex flex-col gap-4">
            <h3 className="font-display text-2xl uppercase tracking-[0.15em] text-ink">Choose a username</h3>
            <input className={inputClass} type="text" placeholder="Username" value={username}
              onChange={(e) => setUsername(e.target.value)} required autoComplete="off" />
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Continue"}</Button>
          </form>
        ) : null}

        {step === "done" ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <h3 className="font-display text-2xl uppercase tracking-[0.15em] text-ink text-glow-blue">
              Signed in as {displayName}
            </h3>
            <Button type="button" onClick={() => router.push(role === "admin" ? "/admin" : "/subscribe")}>
              {role === "admin" ? "Go to your dashboard" : "Go to your membership"}
            </Button>
            <Button type="button" variant="ghost" onClick={handleLogout}>Log out</Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
