import {
  getDispositivos,
  getEscuelas,
  getRegistrosRecientes,
  calcularUptimePorDispositivo,
  calcularCalidadRed,
} from "@/lib/queries";
import { getCasoStats } from "@/lib/tickets";
import type { Dispositivo, Escuela } from "@/lib/firebase";
import type { MapMarker } from "@/components/SchoolMap";
import type { InsightsData } from "@/components/InsightsPanel";
import type { UptimeData } from "@/components/UptimeChart";
import type { SystemHealthData } from "@/components/SystemHealthSummary";
import { SpeedChart } from "@/components/SpeedChart";
import { UptimeChart } from "@/components/UptimeChart";
import { InsightsPanel } from "@/components/InsightsPanel";
import { SystemHealthSummary } from "@/components/SystemHealthSummary";
import { SchoolMapWrapper } from "@/components/SchoolMapWrapper";
import { KpiCard } from "@/components/KpiCard";
import {
  Wifi,
  Download,
  Gauge,
  TicketCheck,
  BatteryFull,
  ShieldCheck,
} from "lucide-react";

export const revalidate = 60;

const CARD = "rounded-xl border bg-white p-4 shadow-sm";
const CARD_STYLE = { borderColor: "#e2e8f0" };
const TITLE = "text-xs font-semibold uppercase tracking-widest mb-1 text-slate-500";

function avg(nums: number[]) {
  const valid = nums.filter((n) => n > 0);
  if (!valid.length) return 0;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

function parseTemp(temp: string): number {
  const n = parseFloat(temp);
  return isNaN(n) ? 0 : n;
}

interface PageProps {
  searchParams: Promise<{ sonda?: string }>;
}

export default async function Home({ searchParams }: PageProps) {
  const { sonda: sondaParam } = await searchParams;
  const [dispositivos, escuelas, registros, casoStats] = await Promise.all([
    getDispositivos(),
    getEscuelas(),
    getRegistrosRecientes(500),
    getCasoStats(),
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

  // ── KPI calculations ─────────────────────────────────────
  const totalDispositivos = filteredDispositivos.length;
  const onlineDevices = filteredDispositivos.filter((d) => d.online);
  const sondasActivas = onlineDevices.length;

  const ethPromedio = avg(onlineDevices.map((d) => d.eth_download_mbps));
  const wifiPromedio = avg(onlineDevices.map((d) => d.wifi_download_mbps));

  const calidadRed = calcularCalidadRed(filteredDispositivos);

  const casosAbiertos = casoStats.abiertos + casoStats.enProceso;

  const upsActivas = filteredDispositivos.filter((d) => d.ups_conectada === true).length;

  const filtroActivo = filteredDispositivos.filter(
    (d) => d.web_check_adultos === "BLOQUEADO"
  ).length;

  const kpis = [
    {
      label: "Sondas Activas",
      value: `${sondasActivas}/${totalDispositivos}`,
      icon: Wifi,
      color: "#1e3a5f",
    },
    {
      label: "Ethernet Prom.",
      value: ethPromedio > 0 ? `${ethPromedio} Mbps` : "--",
      icon: Download,
      color: "#1e3a5f",
    },
    {
      label: "WiFi Prom.",
      value: wifiPromedio > 0 ? `${wifiPromedio} Mbps` : "--",
      icon: Wifi,
      color: "#2e6da4",
    },
    {
      label: "Calidad de Red",
      value: `${calidadRed}/100`,
      icon: Gauge,
      color:
        calidadRed >= 70
          ? "#1e5f4a"
          : calidadRed >= 50
            ? "#d97706"
            : "#b91c1c",
    },
    {
      label: "Casos Abiertos",
      value: String(casosAbiertos),
      icon: TicketCheck,
      color: casosAbiertos > 0 ? "#d97706" : "#1e5f4a",
    },
    {
      label: "UPS Activas",
      value: `${upsActivas}/${totalDispositivos}`,
      icon: BatteryFull,
      color: "#3b82a0",
    },
    {
      label: "Filtro Contenido",
      value: `${filtroActivo}/${totalDispositivos}`,
      icon: ShieldCheck,
      color: filtroActivo === totalDispositivos ? "#1e5f4a" : "#d97706",
    },
  ];

  // ── Map markers ───────────────────────────────────────────
  // Demo: coordenadas de escuelas reales en El Salvador para sondas sin GPS
  const DEMO_LOCATIONS = [
    { lat: 13.7013, lng: -89.2011, name: "San Salvador" },       // Centro Escolar España
    { lat: 13.6773, lng: -89.2358, name: "Antiguo Cuscatlán" },  // C.E. Walter Thilo Deininger
    { lat: 13.7942, lng: -88.8965, name: "Cojutepeque" },        // C.E. Cojutepeque
    { lat: 13.4833, lng: -88.1833, name: "San Miguel" },          // C.E. San Miguel
    { lat: 14.0333, lng: -89.5500, name: "Santa Ana" },           // C.E. Santa Ana
    { lat: 13.3500, lng: -87.8500, name: "La Unión" },            // C.E. La Unión
    { lat: 13.7167, lng: -89.7333, name: "Sonsonate" },           // C.E. Sonsonate
  ];
  const markers: MapMarker[] = filteredDispositivos.map((d, i) => {
    const cleanId = (d.cpu_id || d.id).replace(/"/g, "").trim();
    const esc = escuelas[cleanId] ?? escuelas[d.cpu_id] ?? escuelas[d.id] ?? ({} as Partial<Escuela>);
    const demo = DEMO_LOCATIONS[i % DEMO_LOCATIONS.length];
    const lat = esc.latitud_fija || d.latitud || demo.lat;
    const lng = esc.longitud_fija || d.longitud || demo.lng;
    return {
      id: cleanId,
      nombre: esc.nombre_escuela || cleanId,
      lat,
      lng,
      online: d.online,
      download_mbps: d.download_mbps,
      eth_download_mbps: d.eth_download_mbps,
      wifi_download_mbps: d.wifi_download_mbps,
      ups_status: d.ups_status,
      web_check_mined: d.web_check_mined,
      web_check_adultos: d.web_check_adultos,
    } satisfies MapMarker;
  });

  // ── Alerts sidebar: offline devices ───────────────────────
  const offlineDevices = filteredDispositivos
    .filter((d) => !d.online)
    .slice(0, 8)
    .map((d) => {
      const cleanId = (d.cpu_id || d.id).replace(/"/g, "").trim();
      const esc = escuelas[cleanId] ?? escuelas[d.cpu_id] ?? escuelas[d.id];
      return {
        cpuId: cleanId,
        nombre: esc?.nombre_escuela || cleanId,
        download_mbps: d.download_mbps,
        eth_download_mbps: d.eth_download_mbps,
        wifi_download_mbps: d.wifi_download_mbps,
        ups_status: d.ups_status,
      };
    });

  // ── Speed chart from registros recientes ──────────────────
  const registrosMuestra = [...filteredRegistros].reverse().slice(-30);
  const speedData = registrosMuestra
    .map((r) => {
      const ts = r.timestamp;
      let hora = "";
      if (ts && typeof ts === "object" && "toDate" in ts) {
        const d = (ts as { toDate: () => Date }).toDate();
        hora = d.toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit", timeZone: "America/El_Salvador" });
      }
      return {
        hora,
        descarga: r.eth_download_mbps || r.download_mbps,
        subida: r.wifi_download_mbps,
      };
    });

  // ── System health summary ─────────────────────────────────
  const onlineForHealth = filteredDispositivos.filter((d) => d.online);
  const systemHealth: SystemHealthData = {
    avgCpu: avg(onlineForHealth.map((d) => d.cpu_usage)),
    avgRam: avg(onlineForHealth.map((d) => d.ram_usage)),
    avgTemp: avg(onlineForHealth.map((d) => parseTemp(d.temp_cpu))),
    avgUpsNivel: avg(onlineForHealth.map((d) => d.ups_nivel)),
    avgEthLatencia: avg(onlineForHealth.filter((d) => d.eth_latencia_ms > 0).map((d) => d.eth_latencia_ms)),
    avgWifiLatencia: avg(onlineForHealth.filter((d) => d.wifi_latencia_ms > 0).map((d) => d.wifi_latencia_ms)),
    totalDevices: onlineForHealth.length,
    highCpu: onlineForHealth.filter((d) => d.cpu_usage > 80).length,
    highRam: onlineForHealth.filter((d) => d.ram_usage > 80).length,
    highTemp: onlineForHealth.filter((d) => parseTemp(d.temp_cpu) > 70).length,
    lowUps: onlineForHealth.filter((d) => d.ups_nivel > 0 && d.ups_nivel < 30).length,
    highEthLatencia: onlineForHealth.filter((d) => d.eth_latencia_ms > 200).length,
    highWifiLatencia: onlineForHealth.filter((d) => d.wifi_latencia_ms > 200).length,
  };

  // ── Insights ──────────────────────────────────────────────
  const filtroBypassCount = filteredDispositivos.filter(
    (d) => d.web_check_adultos === "ACCESIBLE"
  ).length;
  const minedInaccesible = filteredDispositivos.filter(
    (d) => d.web_check_mined === "BLOQUEADO"
  ).length;
  const sondasEnRiesgo = filteredDispositivos.filter(
    (d) => d.download_mbps < 5 || !d.online
  ).length;
  const upsProblemas = filteredDispositivos.filter(
    (d) =>
      d.ups_status &&
      d.ups_status !== "normal" &&
      d.ups_status !== "Online" &&
      d.ups_conectada
  ).length;

  const uptimeStats = calcularUptimePorDispositivo(filteredRegistros);
  const uptimeArr = Object.values(uptimeStats).filter((s) => s.total >= 3);
  uptimeArr.sort((a, b) => a.uptime - b.uptime);
  const peorDispositivo =
    uptimeArr.length > 0
      ? {
          cpuId: uptimeArr[0].cpuId,
          nombre:
            escuelas[uptimeArr[0].cpuId]?.nombre_escuela ?? uptimeArr[0].cpuId,
          uptime: uptimeArr[0].uptime,
        }
      : null;
  const mejorDispositivo =
    uptimeArr.length > 0
      ? {
          cpuId: uptimeArr[uptimeArr.length - 1].cpuId,
          nombre:
            escuelas[uptimeArr[uptimeArr.length - 1].cpuId]?.nombre_escuela ??
            uptimeArr[uptimeArr.length - 1].cpuId,
          uptime: uptimeArr[uptimeArr.length - 1].uptime,
        }
      : null;

  const insights: InsightsData = {
    filtroBypassCount,
    filtroTotalCount: totalDispositivos,
    minedInaccesible,
    minedTotalCount: totalDispositivos,
    sondasEnRiesgo,
    upsProblemas,
    peorDispositivo,
    mejorDispositivo,
  };

  // ── Uptime data ───────────────────────────────────────────
  const uptimeData: UptimeData[] = Object.values(uptimeStats).map((s) => ({
    cpuId: s.cpuId,
    nombre: escuelas[s.cpuId]?.nombre_escuela ?? s.cpuId,
    uptime: s.uptime,
  }));

  return (
    <div className="flex flex-col gap-4 max-w-full">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-7 gap-3">
        {kpis.map(({ label, value, icon, color }) => (
          <KpiCard
            key={label}
            label={label}
            value={value}
            icon={icon}
            color={color}
          />
        ))}
      </div>

      {/* Map + Alerts */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Mapa hero */}
        <div
          className="flex-1 flex flex-col rounded-xl border bg-white shadow-sm overflow-hidden"
          style={CARD_STYLE}
        >
          <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
            <p className={TITLE}>Infraestructura de Red — El Salvador</p>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />{" "}
                En linea
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />{" "}
                UPS
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />{" "}
                Offline
              </span>
            </div>
          </div>
          <div style={{ height: "380px" }}>
            <SchoolMapWrapper markers={markers} />
          </div>
        </div>

        {/* Panel alertas */}
        <div className={`lg:w-72 flex flex-col ${CARD}`} style={CARD_STYLE}>
          <p className={TITLE}>Dispositivos Offline</p>
          <div className="overflow-y-auto space-y-2 mt-2 max-h-80 lg:max-h-[380px]">
            {offlineDevices.length === 0 ? (
              <p className="text-xs text-center py-6 text-green-600">
                Sin dispositivos offline
              </p>
            ) : (
              offlineDevices.map((d) => (
                <div
                  key={d.cpuId}
                  className="rounded-lg p-3 border border-red-100 bg-red-50"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-red-700 truncate max-w-[140px]">
                      {d.nombre}
                    </span>
                    <span className="text-[10px] font-mono text-red-400 bg-red-100 px-1.5 py-0.5 rounded-full shrink-0">
                      OFFLINE
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Eth: {d.eth_download_mbps > 0 ? `${d.eth_download_mbps.toFixed(1)} Mbps` : "--"}
                    {" · "}WiFi: {d.wifi_download_mbps > 0 ? `${d.wifi_download_mbps.toFixed(1)} Mbps` : "--"}
                  </p>
                  {d.ups_status && (
                    <p className="text-xs text-slate-400">UPS: {d.ups_status}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={CARD} style={CARD_STYLE}>
          <p className={`${TITLE} mb-3`}>Salud del Sistema</p>
          <SystemHealthSummary data={systemHealth} />
        </div>
        <div className={CARD} style={CARD_STYLE}>
          <p className={`${TITLE} mb-3`}>Velocidad Ethernet vs WiFi — Mbps</p>
          <SpeedChart data={speedData} />
        </div>
      </div>

      {/* Insights Operativos */}
      <div>
        <p className={`${TITLE} mb-3`}>Insights Operativos</p>
        <InsightsPanel data={insights} />
      </div>

      {/* Uptime por Dispositivo */}
      <div className={CARD} style={CARD_STYLE}>
        <p className={`${TITLE} mb-3`}>Uptime por Dispositivo — %</p>
        <UptimeChart data={uptimeData} />
      </div>
    </div>
  );
}
