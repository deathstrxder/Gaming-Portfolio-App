"use client";

import { useRouter } from "next/navigation";
import { MemberChrome } from "./MemberChrome";
import { Button } from "@/components/ui/button";

export function SubscribeScreen() {
  const router = useRouter();
  return (
    <MemberChrome backHref="/">
      <Button
        onClick={() => router.push("/pay")}
        className="h-auto rounded-2xl px-16 py-10 text-4xl tracking-[0.3em] sm:text-5xl"
      >
        Subscribe
      </Button>
    </MemberChrome>
  );
}
