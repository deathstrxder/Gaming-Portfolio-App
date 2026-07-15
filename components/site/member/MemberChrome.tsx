"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MemberChrome({
  backHref,
  children,
}: {
  backHref: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <div className="relative min-h-screen">
      <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-4 sm:px-10">
        <button
          aria-label="Go back"
          onClick={() => router.push(backHref)}
          className="flex h-11 w-11 items-center justify-center rounded-md border border-white/10 bg-bg-elev/80 text-neon-blue transition-colors hover:box-glow-blue"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="relative">
          <button
            aria-label="Account menu"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-bg-elev/80 text-neon-purple transition-colors hover:box-glow-purple"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-7 8-7s8 3 8 7" strokeLinecap="round" />
            </svg>
          </button>
          {menuOpen ? (
            <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-md border border-white/10 bg-bg-elev shadow-lg">
              <button
                onClick={() => router.push("/account")}
                className="block w-full px-4 py-3 text-left font-body text-sm text-ink transition-colors hover:bg-neon-blue/10 hover:text-neon-blue"
              >
                Account details
              </button>
              <button
                onClick={logout}
                className="block w-full px-4 py-3 text-left font-body text-sm text-ink transition-colors hover:bg-neon-purple/10 hover:text-neon-purple"
              >
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </header>
      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">{children}</main>
    </div>
  );
}
