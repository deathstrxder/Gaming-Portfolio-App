"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MemberChrome } from "./MemberChrome";
import { Button } from "@/components/ui/button";

export function SubscribeScreen() {
  const router = useRouter();
  const [claimed, setClaimed] = useState(false);

  /**
   * The Google callback lands here with ?claimed=1 when it took ownership of an
   * account whose email had never been confirmed, which clears any password set
   * on it.
   *
   * The common case is not an attacker being evicted — it is a real user whose
   * verification email went to spam and who signed in with Google instead.
   * Destroying their password without a word would look like our bug rather
   * than a security measure, so this notice is not optional.
   */
  useEffect(() => {
    void Promise.resolve().then(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("claimed") === "1") {
        setClaimed(true);
        window.history.replaceState({}, "", window.location.pathname);
      }
    });
  }, []);

  return (
    <MemberChrome backHref="/">
      {claimed ? (
        <p className="mb-8 max-w-xl rounded-md border border-neon-blue/40 bg-neon-blue/10 px-4 py-3 text-center font-body text-sm text-neon-blue">
          Signed in with Google. This email had never been confirmed, so any password previously set
          on it has been cleared — you can set a new one from your account page.
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
