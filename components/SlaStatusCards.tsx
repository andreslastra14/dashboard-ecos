import { CheckmarkFilled, WifiOff } from "@carbon/icons-react";

interface SlaStatusCardsProps {
  normal: number;
  offline: number;
}

export function SlaStatusCards({ normal, offline }: SlaStatusCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div
        className="relative rounded-xl border bg-white p-5 shadow-sm overflow-hidden"
        style={{ borderColor: "#e2e8f0" }}
      >
        <div
          className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.04] -translate-y-8 translate-x-8"
          style={{ backgroundColor: "#0062a8" }}
        />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mb-1"
              style={{ color: "#64748b" }}
            >
              Normal
            </p>
            <p
              className="text-4xl font-bold font-mono leading-none"
              style={{ color: "#0062a8" }}
            >
              {normal}
            </p>
            <p className="text-[11px] mt-2 flex items-center gap-1.5" style={{ color: "#64748b" }}>
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: "#4ade80" }}
              />
              Reportando · sin alerta
            </p>
          </div>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: "#0062a814" }}
          >
            <CheckmarkFilled size={20} style={{ color: "#0062a8" }} />
          </div>
        </div>
      </div>

      <div
        className="relative rounded-xl border bg-white p-5 shadow-sm overflow-hidden"
        style={{ borderColor: offline > 0 ? "#fecaca" : "#e2e8f0" }}
      >
        <div
          className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-[0.04] -translate-y-8 translate-x-8"
          style={{ backgroundColor: offline > 0 ? "#b91c1c" : "#94a3b8" }}
        />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mb-1"
              style={{ color: "#64748b" }}
            >
              Offline
            </p>
            <p
              className="text-4xl font-bold font-mono leading-none"
              style={{ color: offline > 0 ? "#b91c1c" : "#94a3b8" }}
            >
              {offline}
            </p>
            <p className="text-[11px] mt-2 flex items-center gap-1.5" style={{ color: "#64748b" }}>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: offline > 0 ? "#b91c1c" : "#cbd5e1" }}
              />
              {offline > 0 ? "Sin señal · requiere atención" : "Todas reportando"}
            </p>
          </div>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: offline > 0 ? "#b91c1c14" : "#94a3b814" }}
          >
            <WifiOff
              size={20}
              style={{ color: offline > 0 ? "#b91c1c" : "#94a3b8" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
