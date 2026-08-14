/**
 * The subject every IP-keyed rate limit is counted against.
 *
 * Reading this wrong silently disables the limiter rather than breaking it, so
 * the rule lives in one tested place instead of at each call site.
 *
 * `x-forwarded-for` is APPENDABLE BY THE CALLER. Taking its first entry — the
 * obvious implementation, and the one most examples show — lets anyone mint a
 * fresh subject per request by sending `x-forwarded-for: <random>`, which turns
 * every IP-keyed limit in the app into a no-op. The trustworthy value is the one
 * the edge itself attached: `x-real-ip` where the platform provides it (Vercel
 * does), otherwise the LAST forwarded-for entry, which is the hop nearest us.
 *
 * The ordering also means this stays correct if the platform stops setting
 * `x-real-ip`: the fallback still reads the edge-appended entry rather than a
 * caller-supplied one.
 */
export const SHARED_SUBJECT = "unknown";

export function clientIp(request: Request): string {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const entries = forwarded
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    const last = entries[entries.length - 1];
    if (last) return last;
  }

  // Deliberately one shared bucket rather than "unlimited": an attacker able to
  // strip both headers must not thereby escape every limit.
  return SHARED_SUBJECT;
}
