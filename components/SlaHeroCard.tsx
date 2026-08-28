import Image from "next/image";
import type { SlaResult } from "@/lib/sla";

interface SlaHeroCardProps {
  sla: SlaResult;
  titulo: string;
  subtitulo: string;
  total: number;
  online: number;
  fechaCorte: Date;
  minutosDesdeCorte?: number;
}

function formatFecha(d: Date): string {
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = meses[d.getMonth()];
  const yyyy = d.getFullYear();
  return `${dd} ${mm} ${yyyy}`;
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
  minutosDesdeCorte = 0,
}: SlaHeroCardProps) {
  const valorFmt = `${sla.valor.toFixed(0)}%`;
  // Activo solo si hay al menos una sonda online (online = sondas activas).
  const activo = online > 0;
  const pct = Math.min(100, Math.max(0, sla.valor));

  return (
    <div
      className="relative overflow-hidden rounded-xl border shadow-sm"
      style={{
        backgroundColor: "#04263e",
        borderColor: "#0062a8",
      }}
    >
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 100% 0%, #0a78c8 0%, transparent 60%), radial-gradient(ellipse 80% 70% at 0% 100%, #0062a8 0%, transparent 50%)",
        }}
      />

      <div className="relative px-5 lg:px-6 py-4 border-b" style={{ borderColor: "#0062a8" }}>
        <div className="flex items-center gap-3">
          <Image
            src="/brand/rapidnet-white-256.png"
            alt="RapidNet"
            width={110}
            height={28}
            className="object-contain shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p
              className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: "#93c5fd" }}
            >
              {titulo}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
              {subtitulo}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`w-2 h-2 rounded-full ${activo ? "animate-pulse" : ""}`}
              style={{ backgroundColor: activo ? "#4ade80" : "#fbbf24" }}
            />
            <span
              className="text-xs font-medium hidden sm:inline"
              style={{ color: activo ? "#4ade80" : "#fbbf24" }}
            >
              {activo ? "Activo" : `Hace ${Math.round(minutosDesdeCorte)} min`}
            </span>
          </div>
        </div>
      </div>

      <div className="relative px-5 lg:px-6 py-6 lg:py-7">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div className="flex items-baseline gap-4">
            <span
              className="text-6xl lg:text-7xl font-bold font-mono leading-none tracking-tight"
              style={{ color: "#ffffff" }}
            >
              {valorFmt}
            </span>
            <div className="flex flex-col gap-0.5">
              <p
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "#93c5fd" }}
              >
                Disponibilidad de Red
              </p>
              <p className="text-sm" style={{ color: "#cbd5e1" }}>
                <span className="font-mono font-semibold text-white">{online}</span>
                <span style={{ color: "#94a3b8" }}> de </span>
                <span className="font-mono font-semibold text-white">{total}</span>
                <span style={{ color: "#94a3b8" }}> sondas activas</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-mono"
              style={{ backgroundColor: "#0062a8", color: "#93c5fd" }}
            >
              <span style={{ color: "#64748b" }} className="text-[10px] uppercase tracking-wider">Fecha</span>
              <span>{formatFecha(fechaCorte)}</span>
            </div>
            <div
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-mono"
              style={{ backgroundColor: "#0062a8", color: "#93c5fd" }}
            >
              <span style={{ color: "#64748b" }} className="text-[10px] uppercase tracking-wider">Corte</span>
              <span>{formatHora(fechaCorte)}</span>
            </div>
            <div
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-mono"
              style={{ backgroundColor: "#0062a8", color: "#93c5fd" }}
            >
              <span style={{ color: "#64748b" }} className="text-[10px] uppercase tracking-wider">Sitios</span>
              <span>{total}</span>
            </div>
          </div>
        </div>

        <div
          className="mt-5 h-1.5 w-full rounded-full overflow-hidden"
          style={{ backgroundColor: "#0f1d32" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background:
                "linear-gradient(90deg, #0a78c8 0%, #4a7c8e 50%, #93c5fd 100%)",
              boxShadow: "0 0 12px rgba(147, 197, 253, 0.4)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
