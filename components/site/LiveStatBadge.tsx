import { getLiveStats } from "@/lib/stats/read";
import { formatCompactNumber, formatCount, formatRelativeTime, isStale } from "@/lib/stats/format";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="font-body text-sm uppercase tracking-[0.15em] text-muted">{label}</span>
      <span className="font-display text-lg font-bold text-neon-blue text-glow-blue">{value}</span>
    </div>
  );
}

export async function LiveStatBadge({ gameId }: { gameId: string }) {
  if (gameId !== "minecraft") return null;

  const stats = await getLiveStats();
  const hypixel = stats.providers.hypixel;
  if (!hypixel?.data) return null;

  const { bridge, skyblock } = hypixel.data;
  const stale = hypixel.stale || isStale(hypixel.fetchedAt);

  return (
    <div className="mt-auto border-t border-neon-blue/25 pt-5">
      <div className="mb-4 flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${
            stale
              ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]"
              : "bg-neon-blue shadow-[0_0_8px_rgba(34,211,238,0.9)]"
          }`}
        />
        <span className="font-display text-xs uppercase tracking-[0.25em] text-muted">
          {stale ? "Cached" : "Live"}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {skyblock && (
          <Row label="Skyblock Networth" value={formatCompactNumber(skyblock.networth)} />
        )}
        <Row label="Bridge (Duels)" value={bridge.title} />
        <Row
          label="Record"
          value={`${formatCount(bridge.wins)}W / ${formatCount(bridge.losses)}L · ${bridge.wlr} WLR`}
        />
        <Row label="Best Winstreak" value={formatCount(bridge.bestWinstreak)} />
      </div>

      {/* Self-reported, not queryable from the Hypixel API — kept visually
          distinct so it is always clear which numbers above are live. */}
      <p className="mt-4 border-t border-white/10 pt-4 font-body text-base text-ink/70">
        <span className="text-neon-purple text-glow-purple">★</span> World record · Bridge
        50-winstreak speedrun
      </p>

      <p className="mt-3 font-body text-sm text-muted/70">
        updated {formatRelativeTime(hypixel.fetchedAt)}
      </p>
    </div>
  );
}
