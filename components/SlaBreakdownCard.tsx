import { CheckmarkFilled } from "@carbon/icons-react";

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
      <p
        className="text-[11px] font-semibold uppercase tracking-widest mb-4"
        style={{ color: "#64748b" }}
      >
        {titulo}
      </p>

      <div className="flex flex-col gap-3.5">
        {items.map((it) => {
          const pct = it.total > 0 ? (it.value / it.total) * 100 : 0;
          return (
            <div key={it.label} className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-28 shrink-0">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: it.color }}
                />
                <span className="text-sm text-slate-700 truncate">{it.label}</span>
              </div>
              <div
                className="flex-1 h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: "#f1f5f9" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(0, pct))}%`,
                    backgroundColor: it.color,
                  }}
                />
              </div>
              <span
                className="text-xs font-mono w-12 text-right"
                style={{ color: "#94a3b8" }}
              >
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
        className="mt-5 pt-3 border-t flex items-center justify-between"
        style={{ borderColor: "#e2e8f0" }}
      >
        <span className="text-xs flex items-center gap-1.5" style={{ color: "#64748b" }}>
          <CheckmarkFilled size={14} style={{ color: "#0062a8" }} />
          {totalLabel}
        </span>
        <span
          className="text-sm font-mono font-semibold"
          style={{ color: "#0062a8" }}
        >
          {totalGeneral} {totalUnidad}
        </span>
      </div>
    </div>
  );
}
