"use client";

import { PasswordInput } from "@/components/site/PasswordInput";
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
  // Distinct from `error`: this reports something that succeeded but changed
  // the account in a way the user must be told about, so it must not be styled
  // or worded as a failure.
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [remember, setRemember] = useState(false);

  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  // Matches the server's 60s per-user resend cooldown. Purely cosmetic — the
  // limiter is the real gate — but without it the button invites a 429.
  const [resendIn, setResendIn] = useState(0);
  const [resendNote, setResendNote] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setGoogleEnabled(Boolean(d.googleEnabled));
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

  // Ticks the resend cooldown down to zero. Mirrors the server's 60s per-user
  // limit so the button is disabled while a press would only earn a 429.
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  useEffect(() => {
    // Deferred to a microtask so replaceState does not run during the commit
    // phase; deliberately fire-and-forget, hence the void.
    void Promise.resolve().then(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("error") === "oauth") {
        setError("Google sign-in failed. Please try again.");
        window.history.replaceState({}, "", window.location.pathname);
      }
      // Google claimed an account whose email had never been confirmed, which
      // clears the password that was set on it. Explaining that is not optional:
      // the common case is a real user whose verification mail went to spam, and
      // silently destroying their password would look like our bug.
      if (params.get("claimed") === "1") {
        setNotice(
          "Signed in with Google. Because this email had never been confirmed, any password previously set on it has been cleared — you can set a new one from your account page.",
        );
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
    if (!ok) {
      if (status === 409) return fail("That email is already registered.");
      if (status === 429) return fail("Too many attempts. Please wait a few minutes and try again.");
      // The account exists but the mail did not go out. Signing up again
      // re-sends rather than refusing, so retrying is genuinely the way out.
      if (status === 503) return fail("We could not send the email just now. Please try again in a moment.");
      return fail("Invalid email or password.");
    }
    setPendingUserId(data.userId);
    setBusy(false);
    setResendIn(60);
    setStep("verify");
  }

  async function handleResend() {
    setError(null);
    setResendNote(null);
    setBusy(true);
    const { ok, status } = await postJson("/api/auth/resend-code", {});
    setBusy(false);
    if (!ok) {
      if (status === 429) return fail("Please wait a moment before requesting another code.");
      return fail("We could not send another code just now.");
    }
    setResendIn(60);
    setResendNote("Sent. Check your inbox, and your spam folder.");
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

        {notice ? (
          <p className="mb-4 rounded-md border border-neon-blue/40 bg-neon-blue/10 px-4 py-2 font-body text-sm text-neon-blue">
            {notice}
          </p>
        ) : null}

        {step === "loading" ? (
          <p className="text-center font-body text-muted">Loading…</p>
        ) : null}

        {step === "signup" ? (
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <h3 className="font-display text-2xl uppercase tracking-[0.15em] text-ink">Create account</h3>
            <input className={inputClass} type="email" placeholder="Email" aria-label="Email" value={email}
              onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            <PasswordInput className={inputClass} placeholder="Password" aria-label="Password" value={password}
              onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
            <PasswordChecklist password={password} />
            <PasswordInput className={inputClass} placeholder="Confirm password" aria-label="Confirm password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
            <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Sign up"}</Button>
            {googleEnabled ? <GoogleAuthOptions /> : null}
            <button type="button" className="font-body text-sm text-muted underline underline-offset-4 hover:text-neon-blue"
              onClick={() => { setError(null); setStep("login"); }}>
              Already have an account? Login instead!
            </button>
          </form>
        ) : null}

        {step === "login" ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <h3 className="font-display text-2xl uppercase tracking-[0.15em] text-ink">Log in</h3>
            <input className={inputClass} type="text" placeholder="Email" aria-label="Email" value={identifier}
              onChange={(e) => setIdentifier(e.target.value)} required autoComplete="username" />
            <PasswordInput className={inputClass} placeholder="Password" aria-label="Password" value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)} required autoComplete="current-password" />
            <label className="flex items-center gap-2 font-body text-sm text-muted">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember me
            </label>
            <Button type="submit" disabled={busy}>{busy ? "Logging in…" : "Log in"}</Button>
            {googleEnabled ? <GoogleAuthOptions /> : null}
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
              We sent a 6-digit code to <span className="text-ink">{email}</span>. It expires in 10 minutes.
            </p>
            {/*
              Said plainly rather than buried, because it is genuinely likely:
              mail goes out from a gmail.com sender through a third-party relay,
              which cannot align DMARC for that domain, so a share of these are
              filed as junk. Telling people up front is cheaper than the support
              conversation it avoids.
            */}
            <p className="font-body text-sm text-muted/70">
              If it has not arrived, check your spam folder — it often lands there.
            </p>
            {/* The placeholder is six underscores, so it is no use as a name. */}
            <input className={`${inputClass} text-center tracking-[0.4em]`} inputMode="numeric" maxLength={6}
              placeholder="______" aria-label="Verification code" value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required />
            <Button type="submit" disabled={busy}>{busy ? "Verifying…" : "Verify"}</Button>
            <button type="button" onClick={handleResend} disabled={busy || resendIn > 0}
              className="font-body text-sm text-neon-blue underline-offset-4 hover:underline disabled:text-muted/50 disabled:no-underline">
              {resendIn > 0 ? `Resend code in ${resendIn}s` : "Send a new code"}
            </button>
            {resendNote ? <p className="font-body text-sm text-neon-blue">{resendNote}</p> : null}
          </form>
        ) : null}

        {step === "username" ? (
          <form onSubmit={handleUsername} className="flex flex-col gap-4">
            <h3 className="font-display text-2xl uppercase tracking-[0.15em] text-ink">Choose a username</h3>
            <input className={inputClass} type="text" placeholder="Username" aria-label="Username" value={username}
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
