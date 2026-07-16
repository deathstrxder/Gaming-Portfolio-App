"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function timezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

function track(type: string, extra: Record<string, unknown> = {}) {
  fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, path: window.location.pathname, tz: timezone(), ...extra }),
    keepalive: true,
  }).catch(() => {});
}

export function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    // Don't measure the admin's own dashboard usage — it would pollute the
    // "most pressed button" / "top pages" analytics with operator activity.
    if (pathname.startsWith("/admin")) return;

    track("page_view");

    function onClick(e: MouseEvent) {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (el.closest("[data-analytics-dodecahedron]")) {
        track("dodecahedron_interaction");
        return;
      }
      const control = el.closest("button, a");
      if (control) {
        const label = (control.getAttribute("data-analytics") || control.textContent || "")
          .trim()
          .slice(0, 80);
        if (label) track("button_click", { target: label });
      }
    }
    document.addEventListener("click", onClick, true);

    const seen = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          const id = (en.target as HTMLElement).id;
          if (en.isIntersecting && id && !seen.has(id)) {
            seen.add(id);
            track("section_view", { section: id });
          }
        }
      },
      { threshold: 0.4 },
    );
    document.querySelectorAll("section[id]").forEach((s) => io.observe(s));

    return () => {
      document.removeEventListener("click", onClick, true);
      io.disconnect();
    };
  }, [pathname]);

  return null;
}
