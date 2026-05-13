interface BreakdownItem {
  label: string;
  value: number;
  total: number;
  color: string;
}

interface SlaBreakdownCardProps {
  titulo: string;
  items: BreakdownItem[];
  totalLabel?: string;
  totalUnidad?: string;
}

export function SlaBreakdownCard({
  titulo,
  items,
  totalLabel = "Total de registros procesados",
  totalUnidad = "sitios",
}: SlaBreakdownCardProps) {
  const totalGeneral = items.reduce((acc, it) => acc + it.value, 0);

  return (
    <div
      className="rounded-xl border bg-white p-5 shadow-sm"
      style={{ borderColor: "#e2e8f0" }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
        {titulo}
      </p>

      <div className="flex flex-col gap-3">
        {items.map((it) => {
          const pct = it.total > 0 ? (it.value / it.total) * 100 : 0;
          return (
            <div key={it.label} className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-24 shrink-0">
                <span
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: it.color }}
                />
                <span className="text-sm text-slate-700">{it.label}</span>
              </div>
              <div className="flex-1 h-2 rounded-full overflow-hidden bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(0, pct))}%`,
                    backgroundColor: it.color,
                  }}
                />
              </div>
              <span className="text-xs font-mono text-slate-500 w-12 text-right">
                {pct.toFixed(0)}%
              </span>
              <span className="text-sm font-mono font-semibold text-slate-900 w-12 text-right">
                {it.value}
              </span>
            </div>
          );
        })}
      </div>

      <div
        className="mt-4 pt-3 border-t flex items-center justify-between"
        style={{ borderColor: "#e2e8f0" }}
      >
        <span className="text-xs text-slate-600 flex items-center gap-1.5">
          <span style={{ color: "#22c55e" }}>✓</span>
          {totalLabel}
        </span>
        <span className="text-sm font-mono font-semibold text-slate-900">
          {totalGeneral} {totalUnidad}
        </span>
      </div>
    </div>
  );
}
