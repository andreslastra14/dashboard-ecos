import { getDispositivos, getRegistrosRecientes } from "@/lib/queries";
import { calcularSlas } from "@/lib/sla";
import { SlaHeroCard } from "@/components/SlaHeroCard";
import { SlaStatusCards } from "@/components/SlaStatusCards";
import { SlaBreakdownCard } from "@/components/SlaBreakdownCard";
import { SlaMiniCard } from "@/components/SlaMiniCard";
import {
  Meter,
  Timer,
  Scales,
  Tools,
  BatteryFull,
  Radio,
} from "@carbon/icons-react";

export const revalidate = 30;

const CARD_STYLE = { borderColor: "#e2e8f0" };
const TITLE = "text-[11px] font-semibold uppercase tracking-widest mb-3";
const TITLE_COLOR = { color: "#64748b" };

interface PageProps {
  searchParams: Promise<{ sonda?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { sonda: sondaParam } = await searchParams;

  const [dispositivos, registros] = await Promise.all([
    getDispositivos(),
    getRegistrosRecientes(3000, 12),
  ]);

  const filteredDispositivos = sondaParam
    ? dispositivos.filter((d) => {
        const cleanId = (d.cpu_id || d.id).replace(/"/g, "").trim();
        return cleanId === sondaParam || d.cpu_id === sondaParam;
      })
    : dispositivos;

  const filteredRegistros = sondaParam
    ? registros.filter((r) => r.cpu_id === sondaParam)
    : registros;

  const sla = calcularSlas(filteredDispositivos, filteredRegistros);

  const hayDatos = filteredDispositivos.length > 0;

  return (
    <div className="flex flex-col gap-4 max-w-full">
      {sondaParam && (
        <div
          className="rounded-lg border px-3 py-2 text-xs text-slate-600 bg-amber-50"
          style={{ borderColor: "#fcd34d" }}
        >
          Vista filtrada a la sonda <span className="font-mono font-semibold">{sondaParam}</span>.
          Los SLAs reflejan solo ese equipo.
        </div>
      )}

      <div className="print-avoid-break">
        <SlaHeroCard
          sla={sla.disponibilidad}
          titulo="Reporte de Estado de Enlaces"
          subtitulo="Sistema de Monitoreo ECOS · MINED El Salvador"
          total={sla.desgloseEstado.total}
          online={sla.desgloseEstado.normal}
          fechaCorte={sla.fechaCorte}
        />
      </div>

      <div className="print-avoid-break">
        <SlaStatusCards
          normal={sla.desgloseEstado.normal}
          offline={sla.desgloseEstado.offline}
        />
      </div>

      <div className="print-avoid-break">
        <SlaBreakdownCard
          titulo="Desglose por Estado"
          totalUnidad="sondas"
          items={[
            {
              label: "Normal",
              value: sla.desgloseEstado.normal,
              total: sla.desgloseEstado.total,
              color: "#1e3a5f",
            },
            {
              label: "Offline",
              value: sla.desgloseEstado.offline,
              total: sla.desgloseEstado.total,
              color: "#b91c1c",
            },
          ]}
        />
      </div>

      <div className="print-avoid-break">
        <p className={TITLE} style={TITLE_COLOR}>SLAs Estratégicos</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <SlaMiniCard
            label="Velocidad Significativa"
            sla={sla.velocidadGiga}
            icon={Meter}
            fuente="UNICEF/ITU Giga · ≥20 Mbps"
          />
          <SlaMiniCard
            label="Latencia P95"
            sla={sla.latenciaP95}
            icon={Timer}
            fuente="ITU-T Y.1541 Clase 1"
          />
          <SlaMiniCard
            label="Cumplimiento ISP"
            sla={sla.cumplimientoIsp}
            icon={Scales}
            fuente="SIGET / Defensoría del Consumidor"
          />
          <SlaMiniCard
            label="MTTR Incidentes"
            sla={sla.mttr}
            icon={Tools}
            fuente="SIGET reportes técnicos"
          />
          <SlaMiniCard
            label="Continuidad UPS"
            sla={sla.upsHealth}
            icon={BatteryFull}
            fuente="Contexto rural El Salvador"
          />
          <SlaMiniCard
            label="Cobertura de Reporte"
            sla={sla.cobertura}
            icon={Radio}
            fuente="Meta-SLA (telemetría 24h)"
          />
        </div>
      </div>

      {hayDatos && sla.porDepartamento.length > 0 && (
        <div
          className="rounded-xl border bg-white p-5 shadow-sm print-avoid-break"
          style={CARD_STYLE}
        >
          <p className={TITLE} style={TITLE_COLOR}>Disponibilidad por Departamento</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2.5">
            {sla.porDepartamento.map((d) => {
              const color =
                d.disponibilidad >= 99
                  ? "#1e3a5f"
                  : d.disponibilidad >= 90
                    ? "#d97706"
                    : "#b91c1c";
              return (
                <div key={d.nombre} className="flex items-center gap-3">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm text-slate-700 truncate flex-1 min-w-0">
                    {d.nombre}
                  </span>
                  <span
                    className="text-xs font-mono font-semibold w-12 text-right"
                    style={{ color }}
                  >
                    {d.disponibilidad.toFixed(0)}%
                  </span>
                  <span className="text-xs font-mono text-slate-400 w-16 text-right">
                    {d.online}/{d.total}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!hayDatos && (
        <div
          className="rounded-xl border bg-white p-8 shadow-sm text-center"
          style={CARD_STYLE}
        >
          <p className="text-sm text-slate-500">
            Sin datos disponibles. Verifica conexión a Cloud SQL o filtros aplicados.
          </p>
        </div>
      )}
    </div>
  );
}
