import "server-only";
import { getDispositivos, getEscuelas, getRegistrosPorRango } from "@/lib/queries";
import { getCasos } from "@/lib/tickets";
import { clasificarPorDepartamento } from "@/lib/geo";
import type { Dispositivo, Escuela, RegistroHistorico } from "@/lib/firebase";

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

export interface DailyStats {
  date: string; // YYYY-MM-DD
  totalRecords: number;
  onlineRecords: number;
  offlineRecords: number;
  availabilityPct: number;
  avgSpeed: number;
}

export interface ZoneSection {
  zona: string;
  totalEscuelas: number;
  online: number;
  offline: number;
  velocidadPromedio: number;
  upsConectadas: number;
  filtroOk: number;
  escuelas: SchoolRow[];
}

export interface ReportData {
  titulo: string;
  zonas: string[];
  desde: string; // YYYY-MM-DD
  hasta: string; // YYYY-MM-DD
  fechaGeneracion: string;
  // Global summary
  totalEscuelas: number;
  online: number;
  offline: number;
  velocidadPromedio: number;
  upsConectadas: number;
  filtroOk: number;
  // Temporal
  dailyStats: DailyStats[];
  // Per-zone breakdown
  zoneSections: ZoneSection[];
  // Tickets
  ticketsAbiertos: Array<{
    idCaso: string;
    escuela: string;
    zona: string;
    motivo: string;
    estado: string;
    fecha: string;
  }>;
}

export async function getReportData(
  zonas: string[],
  desde: Date,
  hasta: Date
): Promise<ReportData> {
  const [dispositivos, escuelasMap, registros, casos] = await Promise.all([
    getDispositivos(),
    getEscuelas(),
    getRegistrosPorRango(desde, hasta),
    getCasos(undefined, 1000),
  ]);

  // Classify all devices by department
  const devicesByZone = new Map<string, Array<{ d: Dispositivo; esc: Escuela | undefined }>>();

  for (const d of dispositivos) {
    const cleanId = (d.cpu_id || d.id).replace(/"/g, "").trim();
    const esc = escuelasMap[cleanId] ?? escuelasMap[d.cpu_id] ?? escuelasMap[d.id];
    const lat = esc?.latitud_fija || d.latitud;
    const lng = esc?.longitud_fija || d.longitud;
    const dept = clasificarPorDepartamento(lat, lng);

    if (dept && zonas.includes(dept)) {
      const arr = devicesByZone.get(dept) || [];
      arr.push({ d, esc });
      devicesByZone.set(dept, arr);
    }
  }

  // Build zone sections
  const zoneSections: ZoneSection[] = [];
  let totalEscuelas = 0;
  let totalOnline = 0;
  let totalUps = 0;
  let totalFiltro = 0;
  const allSpeeds: number[] = [];
  const allZoneCpuIds = new Set<string>();

  for (const zona of zonas) {
    const devices = devicesByZone.get(zona) || [];
    const onlineCount = devices.filter(({ d }) => d.online).length;
    const speeds = devices.map(({ d }) => d.download_mbps || 0);
    const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
    const upsCount = devices.filter(({ d }) => d.ups_conectada).length;
    const filtroCount = devices.filter(({ d }) => d.web_check_adultos === "BLOQUEADO").length;

    const escuelas: SchoolRow[] = devices.map(({ d, esc }) => {
      const cpuId = (d.cpu_id || d.id).replace(/"/g, "").trim();
      allZoneCpuIds.add(cpuId);
      return {
        nombre: esc?.nombre_escuela || cpuId,
        cpuId,
        online: d.online,
        downloadMbps: Math.round((d.download_mbps || 0) * 100) / 100,
        upsStatus: d.ups_status || "N/A",
        upsNivel: d.ups_nivel || 0,
        filtroMined: d.web_check_mined || "N/A",
        filtroAdultos: d.web_check_adultos || "N/A",
      };
    });

    zoneSections.push({
      zona,
      totalEscuelas: devices.length,
      online: onlineCount,
      offline: devices.length - onlineCount,
      velocidadPromedio: Math.round(avgSpeed * 100) / 100,
      upsConectadas: upsCount,
      filtroOk: filtroCount,
      escuelas,
    });

    totalEscuelas += devices.length;
    totalOnline += onlineCount;
    totalUps += upsCount;
    totalFiltro += filtroCount;
    allSpeeds.push(...speeds);
  }

  const velocidadPromedio = allSpeeds.length > 0
    ? Math.round((allSpeeds.reduce((a, b) => a + b, 0) / allSpeeds.length) * 100) / 100
    : 0;

  // Build daily stats from historical records
  const dailyMap = new Map<string, { total: number; online: number; speeds: number[] }>();

  // Filter registros to only include devices in selected zones
  const zoneRegistros = registros.filter((r) => allZoneCpuIds.has(r.cpu_id));

  for (const r of zoneRegistros) {
    let dateStr = "";
    const ts = r.timestamp;
    if (ts && typeof ts === "object" && "toDate" in ts) {
      const d = (ts as { toDate: () => Date }).toDate();
      dateStr = d.toISOString().slice(0, 10);
    }
    if (!dateStr) continue;

    const entry = dailyMap.get(dateStr) || { total: 0, online: 0, speeds: [] };
    entry.total++;
    if (r.online) entry.online++;
    if (r.download_mbps > 0) entry.speeds.push(r.download_mbps);
    dailyMap.set(dateStr, entry);
  }

  const dailyStats: DailyStats[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => ({
      date,
      totalRecords: stats.total,
      onlineRecords: stats.online,
      offlineRecords: stats.total - stats.online,
      availabilityPct: stats.total > 0 ? Math.round((stats.online / stats.total) * 1000) / 10 : 0,
      avgSpeed: stats.speeds.length > 0
        ? Math.round((stats.speeds.reduce((a, b) => a + b, 0) / stats.speeds.length) * 100) / 100
        : 0,
    }));

  // Tickets
  const ticketsAbiertos = casos
    .filter((c) => (c.estado === "Abierto" || c.estado === "En Proceso") && allZoneCpuIds.has(c.cpu_id))
    .map((c) => {
      // Find zone for this ticket
      const dev = dispositivos.find((d) => {
        const cid = (d.cpu_id || d.id).replace(/"/g, "").trim();
        return cid === c.cpu_id;
      });
      const esc = dev ? (escuelasMap[(dev.cpu_id || dev.id).replace(/"/g, "").trim()] ?? undefined) : undefined;
      const lat = esc?.latitud_fija || dev?.latitud || 0;
      const lng = esc?.longitud_fija || dev?.longitud || 0;
      const dept = clasificarPorDepartamento(lat, lng) || "Desconocido";

      return {
        idCaso: c.id_caso,
        escuela: c.Nombre_Escuela,
        zona: dept,
        motivo: c.motivo_reporte,
        estado: c.estado,
        fecha: c.fecha_apertura?.toDate?.()
          ? c.fecha_apertura.toDate().toISOString().slice(0, 10)
          : "",
      };
    });

  const desdeStr = desde.toISOString().slice(0, 10);
  const hastaStr = hasta.toISOString().slice(0, 10);

  return {
    titulo: zonas.length === 1 ? `Reporte — ${zonas[0]}` : `Reporte — ${zonas.length} Departamentos`,
    zonas,
    desde: desdeStr,
    hasta: hastaStr,
    fechaGeneracion: new Date().toLocaleDateString("es-SV", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/El_Salvador",
    }),
    totalEscuelas,
    online: totalOnline,
    offline: totalEscuelas - totalOnline,
    velocidadPromedio,
    upsConectadas: totalUps,
    filtroOk: totalFiltro,
    dailyStats,
    zoneSections,
    ticketsAbiertos,
  };
}

// Report by specific sonda IDs (cpu_ids)
export async function getReportDataBySondas(
  sondaIds: string[],
  desde: Date,
  hasta: Date
): Promise<ReportData> {
  const [dispositivos, escuelasMap, registros, casos] = await Promise.all([
    getDispositivos(),
    getEscuelas(),
    getRegistrosPorRango(desde, hasta),
    getCasos(undefined, 1000),
  ]);

  const sondaSet = new Set(sondaIds);

  // Filter devices to only the requested sondas
  const matchedDevices: Array<{ d: Dispositivo; esc: Escuela | undefined; zona: string }> = [];

  for (const d of dispositivos) {
    const cleanId = (d.cpu_id || d.id).replace(/"/g, "").trim();
    if (!sondaSet.has(cleanId)) continue;

    const esc = escuelasMap[cleanId] ?? escuelasMap[d.cpu_id] ?? escuelasMap[d.id];
    const lat = esc?.latitud_fija || d.latitud;
    const lng = esc?.longitud_fija || d.longitud;
    const dept = clasificarPorDepartamento(lat, lng) || "Sin zona";

    matchedDevices.push({ d, esc, zona: dept });
  }

  // Group by zone for sections
  const byZone = new Map<string, Array<{ d: Dispositivo; esc: Escuela | undefined }>>();
  for (const { d, esc, zona } of matchedDevices) {
    const arr = byZone.get(zona) || [];
    arr.push({ d, esc });
    byZone.set(zona, arr);
  }

  const zoneSections: ZoneSection[] = [];
  let totalEscuelas = 0;
  let totalOnline = 0;
  let totalUps = 0;
  let totalFiltro = 0;
  const allSpeeds: number[] = [];
  const allCpuIds = new Set<string>();

  for (const [zona, devices] of byZone) {
    const onlineCount = devices.filter(({ d }) => d.online).length;
    const speeds = devices.map(({ d }) => d.download_mbps || 0);
    const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;
    const upsCount = devices.filter(({ d }) => d.ups_conectada).length;
    const filtroCount = devices.filter(({ d }) => d.web_check_adultos === "BLOQUEADO").length;

    const escuelas: SchoolRow[] = devices.map(({ d, esc }) => {
      const cpuId = (d.cpu_id || d.id).replace(/"/g, "").trim();
      allCpuIds.add(cpuId);
      return {
        nombre: esc?.nombre_escuela || cpuId,
        cpuId,
        online: d.online,
        downloadMbps: Math.round((d.download_mbps || 0) * 100) / 100,
        upsStatus: d.ups_status || "N/A",
        upsNivel: d.ups_nivel || 0,
        filtroMined: d.web_check_mined || "N/A",
        filtroAdultos: d.web_check_adultos || "N/A",
      };
    });

    zoneSections.push({
      zona,
      totalEscuelas: devices.length,
      online: onlineCount,
      offline: devices.length - onlineCount,
      velocidadPromedio: Math.round(avgSpeed * 100) / 100,
      upsConectadas: upsCount,
      filtroOk: filtroCount,
      escuelas,
    });

    totalEscuelas += devices.length;
    totalOnline += onlineCount;
    totalUps += upsCount;
    totalFiltro += filtroCount;
    allSpeeds.push(...speeds);
  }

  const velocidadPromedio = allSpeeds.length > 0
    ? Math.round((allSpeeds.reduce((a, b) => a + b, 0) / allSpeeds.length) * 100) / 100
    : 0;

  // Daily stats from registros filtered to selected sondas
  const dailyMap = new Map<string, { total: number; online: number; speeds: number[] }>();
  const sondaRegistros = registros.filter((r) => allCpuIds.has(r.cpu_id));

  for (const r of sondaRegistros) {
    let dateStr = "";
    const ts = r.timestamp;
    if (ts && typeof ts === "object" && "toDate" in ts) {
      const d = (ts as { toDate: () => Date }).toDate();
      dateStr = d.toISOString().slice(0, 10);
    }
    if (!dateStr) continue;

    const entry = dailyMap.get(dateStr) || { total: 0, online: 0, speeds: [] };
    entry.total++;
    if (r.online) entry.online++;
    if (r.download_mbps > 0) entry.speeds.push(r.download_mbps);
    dailyMap.set(dateStr, entry);
  }

  const dailyStats: DailyStats[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, stats]) => ({
      date,
      totalRecords: stats.total,
      onlineRecords: stats.online,
      offlineRecords: stats.total - stats.online,
      availabilityPct: stats.total > 0 ? Math.round((stats.online / stats.total) * 1000) / 10 : 0,
      avgSpeed: stats.speeds.length > 0
        ? Math.round((stats.speeds.reduce((a, b) => a + b, 0) / stats.speeds.length) * 100) / 100
        : 0,
    }));

  // Tickets
  const ticketsAbiertos = casos
    .filter((c) => (c.estado === "Abierto" || c.estado === "En Proceso") && allCpuIds.has(c.cpu_id))
    .map((c) => {
      const dev = matchedDevices.find(({ d }) => {
        const cid = (d.cpu_id || d.id).replace(/"/g, "").trim();
        return cid === c.cpu_id;
      });
      return {
        idCaso: c.id_caso,
        escuela: c.Nombre_Escuela,
        zona: dev?.zona || "Desconocido",
        motivo: c.motivo_reporte,
        estado: c.estado,
        fecha: c.fecha_apertura?.toDate?.()
          ? c.fecha_apertura.toDate().toISOString().slice(0, 10)
          : "",
      };
    });

  const zonaNames = Array.from(byZone.keys());
  const desdeStr = desde.toISOString().slice(0, 10);
  const hastaStr = hasta.toISOString().slice(0, 10);

  return {
    titulo: sondaIds.length === 1
      ? `Reporte — ${matchedDevices[0]?.esc?.nombre_escuela || sondaIds[0]}`
      : `Reporte — ${sondaIds.length} Sondas`,
    zonas: zonaNames,
    desde: desdeStr,
    hasta: hastaStr,
    fechaGeneracion: new Date().toLocaleDateString("es-SV", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/El_Salvador",
    }),
    totalEscuelas,
    online: totalOnline,
    offline: totalEscuelas - totalOnline,
    velocidadPromedio,
    upsConectadas: totalUps,
    filtroOk: totalFiltro,
    dailyStats,
    zoneSections,
    ticketsAbiertos,
  };
}
