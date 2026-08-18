"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MemberChrome } from "./MemberChrome";
import { Button } from "@/components/ui/button";

export function SubscribeScreen() {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);

  /**
   * Notices the Google callback hands over in the query string.
   *
   * `claimed` — sign-in took ownership of an account whose email had never been
   * confirmed, which clears any password set on it. The common case is not an
   * attacker being evicted; it is a real user whose verification email went to
   * spam and who used Google instead, so destroying their password silently
   * would read as our bug rather than as a security measure.
   *
   * `existing` — they pressed Google on the SIGN UP step but already had an
   * account, so nothing was created. Said out loud because otherwise landing
   * straight in the member area leaves them unsure which account they are in.
   */
  useEffect(() => {
    void Promise.resolve().then(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("claimed") === "1") {
        setNotice(
          "Signed in with Google. This email had never been confirmed, so any password previously set on it has been cleared — you can set a new one from your account page.",
        );
        window.history.replaceState({}, "", window.location.pathname);
      } else if (params.get("existing") === "1") {
        setNotice(
          "You already had an account with this email, so we signed you in instead of creating a new one.",
        );
        window.history.replaceState({}, "", window.location.pathname);
      }
    });
  }, []);

  return (
    <MemberChrome backHref="/">
      {notice ? (
        <p className="mb-8 max-w-xl rounded-md border border-neon-blue/40 bg-neon-blue/10 px-4 py-3 text-center font-body text-sm text-neon-blue">
          {notice}
        </p>
      ) : null}
      <Button
        onClick={() => router.push("/pay")}
        className="h-auto rounded-2xl px-16 py-10 text-4xl tracking-[0.3em] sm:text-5xl"
      >
        Subscribe
      </Button>
    </MemberChrome>
  );
}
