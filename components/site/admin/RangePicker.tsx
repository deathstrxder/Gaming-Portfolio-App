"use client";

import { RANGE_KEYS, RANGE_LABELS, type RangeKey } from "@/lib/analytics/ranges";

/**
 * The time-range control for the traffic tab.
 *
 * One left-aligned row above everything it scopes — never inside a chart card,
 * never one per panel. Presets only; a custom range is a different control and
 * nobody fights a calendar grid for "past 30 days".
 */
export function RangePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: RangeKey;
  onChange: (next: RangeKey) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Time range"
      data-testid="range-picker"
      className="flex flex-wrap items-center gap-2"
    >
      {RANGE_KEYS.map((key) => {
        const selected = key === value;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            disabled={disabled}
            aria-pressed={selected}
            data-testid={`range-${key}`}
            className={`border px-3 py-1.5 font-display text-xs uppercase tracking-[0.15em] transition-colors disabled:opacity-50 ${
              selected
                ? "border-neon-blue bg-neon-blue/10 text-neon-blue"
                : "border-white/10 text-muted hover:border-neon-blue/40 hover:text-ink"
            }`}
          >
            {RANGE_LABELS[key]}
          </button>
        );
      })}
    </div>
  );
}
