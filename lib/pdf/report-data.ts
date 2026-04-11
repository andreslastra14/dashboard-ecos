import "server-only";
import { getDispositivos, getEscuelas } from "@/lib/queries";
import { getCasos } from "@/lib/tickets";
import { clasificarPorDepartamento } from "@/lib/geo";
import type { Dispositivo, Escuela } from "@/lib/firebase";

export interface SchoolRow {
  nombre: string;
  cpuId: string;
  online: boolean;
  downloadMbps: number;
  upsStatus: string;
  upsNivel: number;
  filtroMined: string;
  filtroAdultos: string;
}

export interface ZoneReportData {
  zona: string;
  fecha: string;
  totalEscuelas: number;
  online: number;
  offline: number;
  velocidadPromedio: number;
  upsConectadas: number;
  filtroOk: number;
  escuelas: SchoolRow[];
  ticketsAbiertos: Array<{
    idCaso: string;
    escuela: string;
    motivo: string;
    estado: string;
    fecha: string;
  }>;
}

export async function getZoneReportData(zona: string): Promise<ZoneReportData> {
  const [dispositivos, escuelasMap, casos] = await Promise.all([
    getDispositivos(),
    getEscuelas(),
    getCasos(undefined, 500),
  ]);

  // Classify devices by department and filter to the requested zone
  const zoneDevices: Array<{ d: Dispositivo; esc: Escuela | undefined }> = [];

  for (const d of dispositivos) {
    const cleanId = (d.cpu_id || d.id).replace(/"/g, "").trim();
    const esc = escuelasMap[cleanId] ?? escuelasMap[d.cpu_id] ?? escuelasMap[d.id];

    const lat = esc?.latitud_fija || d.latitud;
    const lng = esc?.longitud_fija || d.longitud;
    const dept = clasificarPorDepartamento(lat, lng);

    if (dept === zona) {
      zoneDevices.push({ d, esc });
    }
  }

  const onlineCount = zoneDevices.filter(({ d }) => d.online).length;
  const speeds = zoneDevices.map(({ d }) => d.download_mbps || 0);
  const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
  const upsConectadas = zoneDevices.filter(({ d }) => d.ups_conectada).length;
  const filtroOk = zoneDevices.filter(({ d }) => d.web_check_adultos === "BLOQUEADO").length;

  const escuelas: SchoolRow[] = zoneDevices.map(({ d, esc }) => ({
    nombre: esc?.nombre_escuela || d.cpu_id || d.id,
    cpuId: (d.cpu_id || d.id).replace(/"/g, "").trim(),
    online: d.online,
    downloadMbps: Math.round((d.download_mbps || 0) * 100) / 100,
    upsStatus: d.ups_status || "N/A",
    upsNivel: d.ups_nivel || 0,
    filtroMined: d.web_check_mined || "N/A",
    filtroAdultos: d.web_check_adultos || "N/A",
  }));

  // Filter tickets for schools in this zone
  const zoneCpuIds = new Set(zoneDevices.map(({ d }) => (d.cpu_id || d.id).replace(/"/g, "").trim()));
  const ticketsAbiertos = casos
    .filter((c) => (c.estado === "Abierto" || c.estado === "En Proceso") && zoneCpuIds.has(c.cpu_id))
    .map((c) => ({
      idCaso: c.id_caso,
      escuela: c.Nombre_Escuela,
      motivo: c.motivo_reporte,
      estado: c.estado,
      fecha: c.fecha_apertura?.toDate?.()
        ? c.fecha_apertura.toDate().toISOString().slice(0, 10)
        : "",
    }));

  return {
    zona,
    fecha: new Date().toLocaleDateString("es-SV", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "America/El_Salvador",
    }),
    totalEscuelas: zoneDevices.length,
    online: onlineCount,
    offline: zoneDevices.length - onlineCount,
    velocidadPromedio: Math.round(avgSpeed * 100) / 100,
    upsConectadas,
    filtroOk,
    escuelas,
    ticketsAbiertos,
  };
}
