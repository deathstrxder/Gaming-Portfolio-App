"use client";

import { useState } from "react";
import { MemberChrome } from "./MemberChrome";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { luhnValid, detectBrand, validateExpiry, validateCvc, cardLast4 } from "@/lib/payment";

const inputClass =
  "w-full rounded-md border border-white/10 bg-bg/60 px-4 py-3 font-body text-ink " +
  "placeholder:text-muted/60 outline-none transition-colors focus:border-neon-blue focus:box-glow-blue";

const UNAVAILABLE = "Subscription is temporarily unavailable. No charge was made.";

export function PayScreen() {
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const brand = detectBrand(number);

  async function recordAttempt(last4: string | null, b: string) {
    await fetch("/api/pay/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ last4, brand: b }),
    });
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!luhnValid(number)) errs.number = "Enter a valid card number.";
    if (!validateExpiry(expiry)) errs.expiry = "Enter a valid, non-expired date (MM/YY).";
    if (!validateCvc(cvc, brand)) errs.cvc = `Enter a valid ${brand === "Amex" ? "4" : "3"}-digit CVC.`;
    if (!name.trim()) errs.name = "Enter the name on the card.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setMessage(null);
      return;
    }
    setBusy(true);
    await recordAttempt(cardLast4(number), brand);
    setBusy(false);
    setMessage(UNAVAILABLE);
  }

  async function handleApplePay() {
    setBusy(true);
    await recordAttempt(null, "Apple Pay");
    setBusy(false);
    setMessage(UNAVAILABLE);
  }

  return (
    <MemberChrome backHref="/subscribe">
      <Card className="hud-corners box-glow-blue w-full max-w-md">
        <CardContent className="p-8">
          <p className="font-display text-sm uppercase tracking-[0.2em] text-muted">Monthly subscription</p>
          <p className="mt-1 font-display text-5xl font-black text-neon-blue text-glow-blue">
            $11.99<span className="text-xl text-muted">/mo</span>
          </p>

          {message ? (
            <p className="mt-6 rounded-md border border-neon-purple/40 bg-neon-purple/10 px-4 py-3 text-center font-body text-neon-purple">
              {message}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleApplePay}
            disabled={busy}
            className="mt-6 flex w-full items-center justify-center rounded-md border border-white/20 bg-white/90 px-4 py-3 font-display text-sm font-semibold uppercase tracking-[0.15em] text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            Apple Pay
          </button>

          <div className="my-5 flex items-center gap-3 font-body text-sm text-muted">
            <span className="h-px flex-1 bg-white/10" />or pay with card<span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handlePay} className="flex flex-col gap-3">
            <div>
              <input className={inputClass} inputMode="numeric" placeholder="Card number" value={number}
                onChange={(e) => setNumber(e.target.value)} />
              {errors.number ? <p className="mt-1 font-body text-sm text-neon-purple">{errors.number}</p> : null}
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <input className={inputClass} placeholder="MM/YY" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
                {errors.expiry ? <p className="mt-1 font-body text-sm text-neon-purple">{errors.expiry}</p> : null}
              </div>
              <div className="flex-1">
                <input className={inputClass} inputMode="numeric" placeholder="CVC" value={cvc} onChange={(e) => setCvc(e.target.value)} />
                {errors.cvc ? <p className="mt-1 font-body text-sm text-neon-purple">{errors.cvc}</p> : null}
              </div>
            </div>
            <div>
              <input className={inputClass} placeholder="Name on card" value={name} onChange={(e) => setName(e.target.value)} />
              {errors.name ? <p className="mt-1 font-body text-sm text-neon-purple">{errors.name}</p> : null}
            </div>
            <Button type="submit" disabled={busy}>{busy ? "Processing…" : "Pay $11.99"}</Button>
          </form>
        </CardContent>
      </Card>
    </MemberChrome>
  );
}
