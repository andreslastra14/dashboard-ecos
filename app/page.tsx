import { getUltimosPorSonda, getAlertasDeRegistros, getUltimosRegistros, calcularUptimePorSonda, calcularCalidadRed, calcularInsights } from "@/lib/queries";
import { getTicketStats } from "@/lib/tickets";
import { LatencyChart } from "@/components/LatencyChart";
import { SpeedChart } from "@/components/SpeedChart";
import { UptimeChart } from "@/components/UptimeChart";
import { InsightsPanel } from "@/components/InsightsPanel";
import { SchoolMapWrapper } from "@/components/SchoolMapWrapper";
import { KpiCard } from "@/components/KpiCard";
import { Badge } from "@/components/ui/badge";
import { Wifi, Download, Upload, Activity, AlertCircle, Gauge, TicketCheck } from "lucide-react";

export const revalidate = 60;

const CARD = "rounded-xl border bg-white p-4 shadow-sm";
const CARD_STYLE = { borderColor: "#e2e8f0" };
const TITLE = "text-xs font-semibold uppercase tracking-widest mb-1 text-slate-500";

function avg(nums: number[]) {
  const valid = nums.filter((n) => n > 0);
  if (!valid.length) return 0;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

export default async function Home() {
  // Parallel fetches — porSonda contains the 500 most recent records
  const [porSonda, allRegistros, ticketStats] = await Promise.all([
    getUltimosPorSonda(),
    getUltimosRegistros(500),
    getTicketStats(),
  ]);
  const registros = Object.values(porSonda);

  const sondasActivas = registros.length;
  const alertas = registros.filter((r) => r.status === "FALLA_RED").length;
  const latenciaPromedio = avg(registros.map((r) => r.pings?.mined ?? -1));
  const velocidadPromedio = avg(registros.map((r) => r.download_mbps).filter((v) => v > 0));
  const subidaPromedio = avg(registros.map((r) => r.upload_mbps).filter((v) => v > 0));

  const sondas = Object.values(porSonda)
    .filter((r) => r.ubicacion?.lat && r.ubicacion?.lng)
    .map((r) => ({
      serie: r.serie,
      lat: r.ubicacion.lat,
      lng: r.ubicacion.lng,
      status: r.status,
      download_mbps: r.download_mbps,
      upload_mbps: r.upload_mbps,
      fecha: r.fecha,
      latencia_mined: r.pings?.mined ?? 0,
    }));

  const muestra = [...registros].reverse().slice(-30);

  const latencyData = muestra.map((r) => ({
    hora: r.fecha?.slice(11, 16) ?? "",
    youtube: r.pings?.youtube > 0 ? r.pings.youtube : 0,
    mined: r.pings?.mined > 0 ? r.pings.mined : 0,
    netflix: r.pings?.netflix > 0 ? r.pings.netflix : 0,
  }));

  const speedData = muestra
    .filter((r) => r.download_mbps > 0)
    .map((r) => ({
      hora: r.fecha?.slice(11, 16) ?? "",
      descarga: r.download_mbps,
      subida: r.upload_mbps,
    }));

  const ultimasAlertas = getAlertasDeRegistros(registros, 6);

  const calidadRed = calcularCalidadRed(allRegistros);
  const uptimeStats = calcularUptimePorSonda(allRegistros);
  const uptimeData = Object.values(uptimeStats).map(({ serie, dispositivo, uptime }) => ({ serie, dispositivo, uptime }));
  const ticketsAbiertos = ticketStats.abiertos + ticketStats.escalados;
  const insights = calcularInsights(allRegistros, porSonda);

  const kpis = [
    { label: "Sondas Activas", value: String(sondasActivas), icon: Wifi, color: "#1e3a5f" },
    { label: "Latencia MINED", value: latenciaPromedio > 0 ? `${latenciaPromedio} ms` : "—", icon: Activity, color: "#2e6da4" },
    { label: "Descarga Prom.", value: velocidadPromedio > 0 ? `${velocidadPromedio} Mbps` : "—", icon: Download, color: "#3b82a0" },
    { label: "Subida Prom.", value: subidaPromedio > 0 ? `${subidaPromedio} Mbps` : "—", icon: Upload, color: "#4a7c8e" },
    { label: "Alertas Críticas", value: String(alertas), icon: AlertCircle, color: alertas > 0 ? "#b91c1c" : "#1e5f4a" },
    { label: "Calidad de Red", value: `${calidadRed}/100`, icon: Gauge, color: calidadRed >= 70 ? "#1e5f4a" : calidadRed >= 50 ? "#d97706" : "#b91c1c" },
    { label: "Tickets Abiertos", value: String(ticketsAbiertos), icon: TicketCheck, color: ticketsAbiertos > 0 ? "#d97706" : "#1e5f4a" },
  ];

  return (
    <div className="flex flex-col gap-4 max-w-full">

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {kpis.map(({ label, value, icon, color }) => (
          <KpiCard key={label} label={label} value={value} icon={icon} color={color} />
        ))}
      </div>

      {/* Map + Alerts — stacked on mobile, side-by-side on desktop */}
      <div className="flex flex-col lg:flex-row gap-4">

        {/* Mapa hero */}
        <div className="flex-1 flex flex-col rounded-xl border bg-white shadow-sm overflow-hidden" style={CARD_STYLE}>
          <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
            <p className={TITLE}>Infraestructura de Red — El Salvador</p>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> OK</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Lat. alta</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Falla</span>
            </div>
          </div>
          {/* Mapa sin padding — llena hasta los bordes redondeados del card */}
          <div style={{ height: "380px" }}>
            <SchoolMapWrapper sondas={sondas} />
          </div>
        </div>

        {/* Panel alertas — debajo del mapa en móvil, a la derecha en desktop */}
        <div className={`lg:w-72 flex flex-col ${CARD}`} style={CARD_STYLE}>
          <p className={TITLE}>Alertas Críticas</p>
          <div className="overflow-y-auto space-y-2 mt-2 max-h-80 lg:max-h-[380px]">
            {ultimasAlertas.length === 0 ? (
              <p className="text-xs text-center py-6 text-green-600">✓ Sin alertas activas</p>
            ) : (
              ultimasAlertas.map((r) => (
                <div key={r.id} className="rounded-lg p-3 border border-red-100 bg-red-50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-semibold text-red-700">{r.serie}</span>
                    <Badge variant="destructive" className="rounded-full text-xs px-1.5 py-0">FALLA</Badge>
                  </div>
                  <p className="text-xs text-slate-600">{r.alertas_detalle?.[0] ?? "Error de conexión"}</p>
                  <p className="text-xs mt-1 text-slate-400">{r.fecha}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Gráficas inferiores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={CARD} style={CARD_STYLE}>
          <p className={`${TITLE} mb-3`}>Latencia por Destino — ms</p>
          <LatencyChart data={latencyData} />
        </div>
        <div className={CARD} style={CARD_STYLE}>
          <p className={`${TITLE} mb-3`}>Velocidad de Red — Mbps</p>
          <SpeedChart data={speedData} />
        </div>
      </div>

      {/* Insights Estratégicos */}
      <div>
        <p className={`${TITLE} mb-3`}>Insights Operativos</p>
        <InsightsPanel data={insights} />
      </div>

      {/* Uptime por Sonda */}
      <div className={CARD} style={CARD_STYLE}>
        <p className={`${TITLE} mb-3`}>Uptime por Sonda — %</p>
        <UptimeChart data={uptimeData} />
      </div>
    </div>
  );
}
