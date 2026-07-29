"use client";

import { MemberChrome } from "./MemberChrome";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Set NEXT_PUBLIC_DONATE_URL to a PayPal link to enable the button.
// While unset the panel renders a thank-you with no outbound link, so the
// page is complete and safe to deploy before the PayPal account exists.
const donateUrl = process.env.NEXT_PUBLIC_DONATE_URL;

export function PayScreen() {
  return (
    <MemberChrome backHref="/subscribe">
      <Card className="hud-corners box-glow-blue w-full max-w-md">
        <CardContent className="p-8 text-center">
          <p className="font-display text-sm uppercase tracking-[0.2em] text-muted">Support the site</p>
          <p className="mt-3 font-body text-ink">
            This project is free and always will be. If you have enjoyed it, a
            donation helps cover hosting.
          </p>

          {donateUrl ? (
            <Button asChild className="mt-8 h-auto rounded-2xl px-10 py-5 text-xl tracking-[0.2em]">
              <a href={donateUrl} target="_blank" rel="noopener noreferrer">
                Donate
              </a>
            </Button>
          ) : (
            <p className="mt-8 rounded-md border border-neon-purple/40 bg-neon-purple/10 px-4 py-3 font-body text-neon-purple">
              Donations are not set up yet — thank you for stopping by.
            </p>
          )}
        </CardContent>
      </Card>
    </MemberChrome>
  );
}
