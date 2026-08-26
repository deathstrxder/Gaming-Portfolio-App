"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/site/PasswordInput";
import { isPasswordValid } from "@/lib/auth/password";
import { PasswordChecklist } from "./PasswordChecklist";

/**
 * `identify` is the single entry point: the user gives an address and the panel
 * works out for itself whether that means signing in or signing up.
 *
 * The panel used to open on a "signup" step with a "log in instead" link, which
 * forced the user to declare an intention before anything could be known — and
 * made "Continue with Google" mean two different things depending on which step
 * it was pressed from, while Google reports only one. Asking for the address
 * first removes the guess entirely.
 */
type Step = "loading" | "identify" | "password" | "create" | "verify" | "username" | "done";

const inputClass =
  "w-full rounded-md border border-white/10 bg-bg/60 px-4 py-3 font-body text-ink " +
  "placeholder:text-muted/60 outline-none transition-colors focus:border-neon-blue focus:box-glow-blue";

/**
 * Google's refusal reasons, passed through by the callback route.
 *
 * Previously every OAuth failure produced the same "please try again", which is
 * actively misleading for the cases that will never succeed on a retry — a
 * consent screen still in Testing mode, or an account an administrator blocks.
 * The full reason is logged server-side; these are the versions a visitor can
 * act on.
 */
const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  oauth: "Google sign-in failed. Please try again.",
  access_denied:
    "Google sign-in was not completed. If you did not cancel it yourself, this site is not yet approved for public Google sign-in.",
  admin_policy_enforced:
    "Your Google account administrator has blocked sign-in to this site.",
  org_internal: "This Google account is not permitted to sign in to this site.",
  invalid_client: "Google sign-in is misconfigured on this site. Please use email and password.",
};

/**
 * Only an address can be looked up. The admin signs in with a username rather
 * than an email (see lib/auth/admin.ts), and there is no account to create from
 * one, so anything that is not an address skips the lookup and goes straight to
 * the password screen. That keeps the admin able to sign in AND keeps usernames
 * out of the enumeration surface.
 */
function looksLikeEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim());
}

/**
 * What survives a reload, which the panel's React state does not.
 *
 * The panel is a section of the home page, so refreshing anywhere in the flow
 * drops the user at the hero with everything reset — which reads as "did that
 * work?" rather than as a reset, and is worst right after a code has been
 * emailed. Only the address and which side of the branch was reached are kept:
 * never a password, and never anything the server would not already say.
 *
 * sessionStorage rather than localStorage, so it dies with the tab.
 */
const RESUME_KEY = "eddie_auth_resume";

interface ResumeState {
  step: "password" | "create";
  identifier: string;
  hasPassword: boolean;
}

function readResume(): ResumeState | null {
  try {
    const raw = window.sessionStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ResumeState;
    // Validated rather than trusted: it is client-writable storage, and a
    // malformed value must not be able to strand the panel on a broken step.
    if (parsed.step !== "password" && parsed.step !== "create") return null;
    if (typeof parsed.identifier !== "string" || !parsed.identifier) return null;
    return { ...parsed, hasPassword: Boolean(parsed.hasPassword) };
  } catch {
    return null;
  }
}

function writeResume(state: ResumeState | null): void {
  try {
    if (state) window.sessionStorage.setItem(RESUME_KEY, JSON.stringify(state));
    else window.sessionStorage.removeItem(RESUME_KEY);
  } catch {
    // Private mode, quota, storage disabled. Resuming is a convenience; losing
    // it must never break signing in.
  }
}

/**
 * Puts the panel's own section in the URL, so a refresh lands back on it rather
 * than at the top of the home page.
 */
function anchorToPanel(): void {
  if (window.location.hash !== "#support") {
    window.history.replaceState({}, "", `${window.location.pathname}#support`);
  }
}

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

  // One field for both paths. It carries the address into signup, and doubles
  // as the login identifier so the admin's username still works.
  const [identifier, setIdentifier] = useState("");
  // Whether the matched account can accept a password at all. False for a
  // Google-created or Google-claimed account, where offering a password field
  // would be offering something guaranteed to fail.
  const [hasPassword, setHasPassword] = useState(true);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
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
        } else if (d.pendingUserId) {
          // Part-way through verifying when the page reloaded. The sealed
          // cookie is the only thing that knew, since React state did not
          // survive — and a code has already been sent, so starting over would
          // waste it and the resend cooldown.
          setPendingUserId(d.pendingUserId);
          const resumed = readResume();
          if (resumed) setIdentifier(resumed.identifier);
          setStep("verify");
        } else {
          const resumed = readResume();
          if (resumed) {
            setIdentifier(resumed.identifier);
            setHasPassword(resumed.hasPassword);
            setStep(resumed.step);
          } else {
            setStep("identify");
          }
        }
      })
      .catch(() => setStep("identify"));
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
      const oauthError = params.get("error");
      if (oauthError) {
        setError(GOOGLE_ERROR_MESSAGES[oauthError] ?? GOOGLE_ERROR_MESSAGES.oauth);
        // Keeps the fragment: dropping it would scroll the user to the top of
        // the home page at the exact moment they are being told something.
        window.history.replaceState({}, "", window.location.pathname + window.location.hash);
      }
      // Google claimed an account whose email had never been confirmed, which
      // clears the password that was set on it. Explaining that is not optional:
      // the common case is a real user whose verification mail went to spam, and
      // silently destroying their password would look like our bug.
      if (params.get("claimed") === "1") {
        setNotice(
          "Signed in with Google. Because this email had never been confirmed, any password previously set on it has been cleared — you can set a new one from your account page.",
        );
        // Keeps the fragment: dropping it would scroll the user to the top of
        // the home page at the exact moment they are being told something.
        window.history.replaceState({}, "", window.location.pathname + window.location.hash);
      }
    });
  }, []);

  function fail(msg: string) {
    setError(msg);
    setBusy(false);
  }

  /** Back to the address field, without losing what was typed. */
  function backToIdentify() {
    setError(null);
    setPassword("");
    setConfirm("");
    setLoginPassword("");
    writeResume(null);
    setStep("identify");
  }

  /**
   * The branch point. One question — "does this address have an account?" —
   * decides between signing in and signing up, so the user never has to.
   */
  async function handleIdentify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!looksLikeEmail(identifier)) {
      // An "@" means they meant an address, so a malformed one is a typo worth
      // naming. Without this check "user@gmail" (no TLD) would be treated as a
      // username and answered with "incorrect email or password", which sends
      // someone hunting for a password problem they do not have.
      if (identifier.includes("@")) {
        return fail("That does not look like a valid email address.");
      }
      // No "@" at all: not an address, so it cannot be a new account. Treat it
      // as a login identifier — this is how the admin username signs in — and
      // let the login route decide.
      setHasPassword(true);
      setStep("password");
      writeResume({ step: "password", identifier, hasPassword: true });
      anchorToPanel();
      return;
    }

    setBusy(true);
    const { ok, status, data } = await postJson("/api/auth/lookup", { email: identifier });
    setBusy(false);
    if (!ok) {
      if (status === 429) return fail("Too many attempts. Please wait a few minutes and try again.");
      return fail("Please enter a valid email address.");
    }

    if (data.exists) {
      const canUsePassword = Boolean(data.hasPassword);
      setHasPassword(canUsePassword);
      setStep("password");
      writeResume({ step: "password", identifier, hasPassword: canUsePassword });
    } else {
      setStep("create");
      writeResume({ step: "create", identifier, hasPassword: false });
    }
    anchorToPanel();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isPasswordValid(password)) return fail("Password does not meet the requirements.");
    if (password !== confirm) return fail("Passwords do not match.");
    setBusy(true);
    const { ok, status, data } = await postJson("/api/auth/signup", {
      email: identifier,
      password,
    });
    if (!ok) {
      // Reachable if an account appeared between the lookup and here, so it
      // sends the user to the password screen rather than to a dead end.
      if (status === 409) {
        setHasPassword(true);
        setStep("password");
        return fail("That email is already registered. Enter your password to sign in.");
      }
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
    // From here the sealed pending cookie is what resumes a reload, so the
    // client-side copy is redundant and would only risk disagreeing with it.
    writeResume(null);
    anchorToPanel();
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
      if (status === 429) return fail("Too many attempts. Please wait a few minutes and try again.");
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
    setIdentifier("");
    writeResume(null);
    setStep("identify");
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

        {step === "identify" ? (
          <form onSubmit={handleIdentify} className="flex flex-col gap-4">
            <h3 className="font-display text-2xl uppercase tracking-[0.15em] text-ink">
              Sign in or sign up
            </h3>
            <p className="font-body text-sm text-muted">
              Enter your email or username
            </p>
            <input className={inputClass} type="text" placeholder="Email" aria-label="Email" value={identifier}
              onChange={(e) => setIdentifier(e.target.value)} required autoComplete="username" />
            <Button type="submit" disabled={busy}>{busy ? "Checking…" : "Continue"}</Button>
            {googleEnabled ? <GoogleAuthOptions /> : null}
          </form>
        ) : null}

        {step === "password" ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <h3 className="font-display text-2xl uppercase tracking-[0.15em] text-ink">Welcome back</h3>
            <p className="font-body text-sm text-muted">
              Signing in as <span className="text-ink">{identifier}</span>
            </p>

            {hasPassword ? (
              <>
                <PasswordInput className={inputClass} placeholder="Password" aria-label="Password" value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)} required autoComplete="current-password" />
                <label className="flex items-center gap-2 font-body text-sm text-muted">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  Remember me
                </label>
                <Button type="submit" disabled={busy}>{busy ? "Logging in…" : "Log in"}</Button>
                {googleEnabled ? <GoogleAuthOptions /> : null}
              </>
            ) : (
              /*
                The account exists but has no password hash — it was created by
                Google, or claimed by Google after its email was never confirmed.
                No password the user could type would be accepted, so offering
                the field would be offering a guaranteed failure.
              */
              <>
                <p className="font-body text-sm text-muted">
                  This account uses Google sign-in.
                </p>
                {googleEnabled ? (
                  <Button asChild>
                    <a href="/api/auth/google">Continue with Google</a>
                  </Button>
                ) : (
                  <p className="font-body text-sm text-muted/70">
                    Google sign-in is unavailable right now. Please try again later.
                  </p>
                )}
              </>
            )}

            <button type="button" className="font-body text-sm text-muted underline underline-offset-4 hover:text-neon-blue"
              onClick={backToIdentify}>
              Use a different email
            </button>
          </form>
        ) : null}

        {step === "create" ? (
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <h3 className="font-display text-2xl uppercase tracking-[0.15em] text-ink">Create account</h3>
            <p className="font-body text-sm text-muted">
              Creating an account for <span className="text-ink">{identifier}</span>
            </p>
            <PasswordInput className={inputClass} placeholder="Password" aria-label="Password" value={password}
              onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
            <PasswordChecklist password={password} />
            <PasswordInput className={inputClass} placeholder="Confirm password" aria-label="Confirm password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
            <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Sign up"}</Button>
            {googleEnabled ? <GoogleAuthOptions /> : null}
            <button type="button" className="font-body text-sm text-muted underline underline-offset-4 hover:text-neon-blue"
              onClick={backToIdentify}>
              Use a different email
            </button>
          </form>
        ) : null}

        {step === "verify" ? (
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <h3 className="font-display text-2xl uppercase tracking-[0.15em] text-ink">Verify your email</h3>
            <p className="font-body text-sm text-muted">
              We sent a 6-digit code to <span className="text-ink">{identifier}</span>. It expires in 10 minutes.
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
            {/*
              The same escape the username step needed, for the same reason.
              This step is resumed from an httpOnly cookie the client cannot
              clear, so without a way out someone who abandons here returns to
              the code screen on every visit until the cookie expires. Logging
              out clears the pending signup as well as the session.
            */}
            <button type="button" onClick={handleLogout}
              className="font-body text-sm text-muted underline underline-offset-4 hover:text-neon-blue">
              Cancel and start over
            </button>
          </form>
        ) : null}

        {step === "username" ? (
          <form onSubmit={handleUsername} className="flex flex-col gap-4">
            <h3 className="font-display text-2xl uppercase tracking-[0.15em] text-ink">Choose a username</h3>
            <p className="font-body text-sm text-muted">
              One last step — this is the name shown on the site.
            </p>
            <input className={inputClass} type="text" placeholder="Username" aria-label="Username" value={username}
              onChange={(e) => setUsername(e.target.value)} required autoComplete="off" />
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Continue"}</Button>
            {/*
              The escape hatch this step used to lack entirely.

              Google sign-in opens a 30-day session BEFORE a username exists, so
              anyone who stopped here — cancelled a later Google attempt, closed
              the tab, changed their mind — came back to this screen on every
              visit with no way off it. The session kept them here and the panel
              offered only "Continue". Signing out is the way out.
            */}
            <button type="button" onClick={handleLogout}
              className="font-body text-sm text-muted underline underline-offset-4 hover:text-neon-blue">
              Cancel and sign out
            </button>
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
