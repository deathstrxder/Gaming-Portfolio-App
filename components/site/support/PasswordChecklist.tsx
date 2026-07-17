"use client";

import { checkPassword, type PasswordChecks } from "@/lib/auth/password";

const RULES: { key: keyof PasswordChecks; label: string }[] = [
  { key: "minLength", label: "6+ characters" },
  { key: "uppercase", label: "An uppercase letter" },
  { key: "lowercase", label: "A lowercase letter" },
  { key: "number", label: "A number" },
  { key: "special", label: "A special character" },
];

export function PasswordChecklist({ password }: { password: string }) {
  const checks = checkPassword(password);
  return (
    <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
      {RULES.map((r) => {
        const ok = checks[r.key];
        return (
          <li
            key={r.key}
            className={`flex items-center gap-2 font-body text-sm transition-colors ${
              ok ? "text-neon-blue" : "text-muted"
            }`}
          >
            <span aria-hidden>{ok ? "✓" : "○"}</span>
            {r.label}
          </li>
        );
      })}
    </ul>
  );
}
