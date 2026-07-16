export interface Row {
  key: string;
  n: number;
}

export function BarList({ title, rows }: { title: string; rows: Row[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div>
      <p className="mb-2 font-display text-sm uppercase tracking-[0.15em] text-muted">{title}</p>
      {rows.length === 0 ? (
        <p className="font-body text-sm text-muted/60">No data yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.key} className="font-body text-sm text-ink">
              <div className="flex justify-between">
                <span>{r.key}</span>
                <span className="text-muted">{r.n}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded bg-white/5">
                <div className="h-full rounded bg-gradient-to-r from-neon-blue to-neon-purple" style={{ width: `${(r.n / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
