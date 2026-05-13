interface SlaStatusCardsProps {
  normal: number;
  offline: number;
}

const CARD_BASE =
  "relative bg-white rounded-xl border shadow-sm p-5 flex flex-col items-center justify-center gap-2 overflow-hidden";

export function SlaStatusCards({ normal, offline }: SlaStatusCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div
        className={CARD_BASE}
        style={{ borderColor: "#bbf7d0" }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
          style={{ backgroundColor: "#22c55e" }}
        />
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "#dcfce7" }}
        >
          <span
            className="w-7 h-7 rounded-full"
            style={{ backgroundColor: "#22c55e" }}
          />
        </div>
        <p className="text-4xl font-bold font-mono text-slate-900">{normal}</p>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-700">
          Normal
        </p>
        <p className="text-[11px] text-slate-400">Sin alerta</p>
      </div>

      <div
        className={CARD_BASE}
        style={{ borderColor: "#fecaca" }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
          style={{ backgroundColor: "#dc2626" }}
        />
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "#fee2e2" }}
        >
          <span
            className="w-7 h-7 rounded-full"
            style={{ backgroundColor: "#dc2626" }}
          />
        </div>
        <p className="text-4xl font-bold font-mono text-slate-900">{offline}</p>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-700">
          Offline
        </p>
        <p className="text-[11px] text-slate-400">Sin señal</p>
      </div>
    </div>
  );
}
