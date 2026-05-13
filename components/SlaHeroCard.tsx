import type { SlaResult } from "@/lib/sla";

interface SlaHeroCardProps {
  sla: SlaResult;
  titulo: string;
  subtitulo: string;
  total: number;
  online: number;
  fechaCorte: Date;
}

function formatFecha(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatHora(d: Date): string {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "P.M." : "A.M.";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

export function SlaHeroCard({
  sla,
  titulo,
  subtitulo,
  total,
  online,
  fechaCorte,
}: SlaHeroCardProps) {
  const ahora = Date.now();
  const minutosDesdeCorte = (ahora - fechaCorte.getTime()) / 60000;
  const actualizado = minutosDesdeCorte < 5;
  const valorFmt = `${sla.valor.toFixed(0)}%`;

  return (
    <div
      className="relative overflow-hidden rounded-xl text-white shadow-sm"
      style={{
        background:
          "linear-gradient(135deg, #1E3A5F 0%, #2e6da4 60%, #3b82a0 100%)",
      }}
    >
      <div className="px-6 py-5 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-base font-semibold leading-tight">{titulo}</h2>
            <p className="text-xs text-white/70 mt-0.5">{subtitulo}</p>
          </div>
          {actualizado ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
              style={{ backgroundColor: "rgba(74, 222, 128, 0.2)", color: "#86efac" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: "#4ade80" }}
              />
              Actualizado
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
              style={{ backgroundColor: "rgba(251, 191, 36, 0.2)", color: "#fcd34d" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: "#fbbf24" }}
              />
              {`Hace ${Math.round(minutosDesdeCorte)} min`}
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-4 flex-wrap">
          <span className="text-6xl md:text-7xl font-bold font-mono leading-none">
            {valorFmt}
          </span>
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/80">
              Disponibilidad de Red
            </p>
            <p className="text-sm text-white/70">
              {online} de {total} sondas activas
            </p>
          </div>
        </div>

        <div className="w-full rounded-full overflow-hidden bg-white/10 h-2.5">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, Math.max(0, sla.valor))}%`,
              background:
                "linear-gradient(90deg, #4ade80 0%, #86efac 50%, #bbf7d0 100%)",
            }}
          />
        </div>

        <div className="flex items-center gap-x-6 gap-y-1 flex-wrap text-xs text-white/80 pt-1">
          <span>
            <span className="text-white/60">Fecha: </span>
            <span className="font-mono font-semibold text-white">
              {formatFecha(fechaCorte)}
            </span>
          </span>
          <span>
            <span className="text-white/60">Hora corte: </span>
            <span className="font-mono font-semibold text-white">
              {formatHora(fechaCorte)}
            </span>
          </span>
          <span>
            <span className="text-white/60">Total sitios: </span>
            <span className="font-mono font-semibold text-white">{total}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
