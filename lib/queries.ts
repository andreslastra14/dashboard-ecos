import { query } from "./postgres";
import type { Dispositivo, Escuela, RegistroHistorico } from "./firebase";

// Consider a sonda "online" if it reported within the last 5 minutes
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

type MasterRow = {
  sonda_id: string;
  eth_download: number | null;
  wifi_download: number | null;
  velocidad_download: number | null;
  latitud: number | null;
  longitud: number | null;
  gps_status: string | null;
  ups_estado: string | null;
  ups_nivel: number | null;
  cpu_temp: number | null;
  eth_latencia: number | null;
  wifi_latencia: number | null;
  fecha_registro: Date;
};

function rowToDispositivo(r: MasterRow, webChecks: Map<string, Record<string, string>>): Dispositivo {
  const now = Date.now();
  const ts = r.fecha_registro.getTime();
  const online = now - ts < ONLINE_WINDOW_MS;
  const checks = webChecks.get(r.sonda_id) || {};
  const seconds = Math.floor(ts / 1000);
  const nanoseconds = (ts % 1000) * 1_000_000;
  const ultimo_reporte = {
    toDate: () => new Date(ts),
    seconds,
    nanoseconds,
  } as import("./firebase").DbTimestamp;

  return {
    id: r.sonda_id,
    cpu_id: r.sonda_id,
    id_hardware: r.sonda_id,
    version_sonda: "ecos",
    online,
    ultimo_reporte,
    download_mbps: Number(r.eth_download ?? r.velocidad_download ?? 0),
    latitud: Number(r.latitud ?? 0),
    longitud: Number(r.longitud ?? 0),
    gps_status: r.gps_status ?? "SIN_SENAL",
    cpu_usage: 0,
    ram_usage: 0,
    disk_usage: 0,
    temp_cpu: r.cpu_temp != null ? String(r.cpu_temp) : "N/A",
    web_check_mined: checks.MINED ?? (online ? "ACCESIBLE" : "SIN_CONEXION"),
    web_check_streaming: checks.Netflix ?? checks.STREAMING ?? (online ? "ACCESIBLE" : "SIN_CONEXION"),
    web_check_adultos: checks.Adultos ?? checks.ADULTOS ?? (online ? "BLOQUEADO" : "SIN_CONEXION"),
    web_check_apuestas: checks.Apuestas ?? checks.APUESTAS ?? (online ? "BLOQUEADO" : "SIN_CONEXION"),
    ups_status: r.ups_estado ?? "NORMAL",
    ups_nivel: Number(r.ups_nivel ?? 0),
    ups_conectada: r.ups_estado === "CON_LUZ",
    ups_modo: r.ups_estado === "CON_BAT" ? "BATERIA" : "LINEA",
    link_rpi_connect: "",
    alerta_enviada: false,
    ticket_activo: !online,
  };
}

async function getLatestWebChecks(): Promise<Map<string, Record<string, string>>> {
  const rows = await query<{ sonda_id: string; sitio_nombre: string; estado_acceso: string }>(
    `SELECT DISTINCT ON (sonda_id, sitio_nombre) sonda_id, sitio_nombre, estado_acceso
     FROM resultados_detallados_web
     ORDER BY sonda_id, sitio_nombre, fecha_registro DESC`
  );
  const map = new Map<string, Record<string, string>>();
  for (const r of rows) {
    if (!map.has(r.sonda_id)) map.set(r.sonda_id, {});
    map.get(r.sonda_id)![r.sitio_nombre] = r.estado_acceso;
  }
  return map;
}

// Latest state per sonda from registros_ecos_master
export async function getDispositivos(): Promise<Dispositivo[]> {
  try {
    const rows = await query<MasterRow>(
      `SELECT DISTINCT ON (sonda_id)
         sonda_id, eth_download, wifi_download, velocidad_download,
         latitud, longitud, gps_status,
         ups_estado, ups_nivel, cpu_temp,
         eth_latencia, wifi_latencia, fecha_registro
       FROM registros_ecos_master
       ORDER BY sonda_id, fecha_registro DESC`
    );
    const webChecks = await getLatestWebChecks();
    return rows.map((r) => rowToDispositivo(r, webChecks));
  } catch (err) {
    console.error("getDispositivos failed:", err);
    return [];
  }
}

// Synthesize "escuelas" from sondas so the dashboard map works.
// The real `escuelas` table has no coordinates; sondas do, so we build
// a virtual inventory keyed by sonda_id using their latest report.
export async function getEscuelas(): Promise<Record<string, Escuela>> {
  try {
    const rows = await query<{ sonda_id: string; latitud: number | null; longitud: number | null }>(
      `SELECT DISTINCT ON (sonda_id) sonda_id, latitud, longitud
       FROM registros_ecos_master
       ORDER BY sonda_id, fecha_registro DESC`
    );
    const map: Record<string, Escuela> = {};
    for (const r of rows) {
      map[r.sonda_id] = {
        id: r.sonda_id,
        nombre_escuela: r.sonda_id.replace(/_/g, " "),
        contacto_principal: "",
        tel_principal: "",
        email_principal: "",
        contacto_secundario: "",
        tel_secundario: "",
        email_secundario: "",
        direccion: "",
        latitud_fija: Number(r.latitud ?? 0),
        longitud_fija: Number(r.longitud ?? 0),
        conectividad: "Dual-link",
        cod_ce: r.sonda_id,
      };
    }
    return map;
  } catch (err) {
    console.error("getEscuelas failed:", err);
    return {};
  }
}

function rowToRegistro(r: MasterRow & { id: number | string }): RegistroHistorico {
  const ts = r.fecha_registro.getTime();
  const online = true; // historical rows always represent a successful report
  const timestamp = {
    toDate: () => new Date(ts),
    seconds: Math.floor(ts / 1000),
    nanoseconds: (ts % 1000) * 1_000_000,
  } as import("./firebase").DbTimestamp;

  return {
    id: String(r.id),
    cpu_id: r.sonda_id,
    download_mbps: Number(r.eth_download ?? r.velocidad_download ?? 0),
    latitud: Number(r.latitud ?? 0),
    longitud: Number(r.longitud ?? 0),
    online,
    web_check_mined: online ? "ACCESIBLE" : "SIN_CONEXION",
    web_check_streaming: online ? "ACCESIBLE" : "SIN_CONEXION",
    web_check_adultos: online ? "BLOQUEADO" : "SIN_CONEXION",
    web_check_apuestas: online ? "BLOQUEADO" : "SIN_CONEXION",
    ups_status: r.ups_estado ?? "NORMAL",
    ups_nivel: Number(r.ups_nivel ?? 0),
    cpu_usage: 0,
    ram_usage: 0,
    timestamp,
  };
}

export async function getRegistrosDispositivo(cpuId: string, limite = 100): Promise<RegistroHistorico[]> {
  try {
    const rows = await query<MasterRow & { id: number }>(
      `SELECT id, sonda_id, eth_download, wifi_download, velocidad_download,
              latitud, longitud, gps_status, ups_estado, ups_nivel, cpu_temp,
              eth_latencia, wifi_latencia, fecha_registro
       FROM registros_ecos_master
       WHERE sonda_id = $1
       ORDER BY fecha_registro DESC
       LIMIT $2`,
      [cpuId, limite]
    );
    return rows.map(rowToRegistro);
  } catch (err) {
    console.error("getRegistrosDispositivo failed:", err);
    return [];
  }
}

export async function getRegistrosRecientes(limite = 200): Promise<RegistroHistorico[]> {
  try {
    const rows = await query<MasterRow & { id: number }>(
      `SELECT id, sonda_id, eth_download, wifi_download, velocidad_download,
              latitud, longitud, gps_status, ups_estado, ups_nivel, cpu_temp,
              eth_latencia, wifi_latencia, fecha_registro
       FROM registros_ecos_master
       ORDER BY fecha_registro DESC
       LIMIT $1`,
      [limite]
    );
    return rows.map(rowToRegistro);
  } catch (err) {
    console.error("getRegistrosRecientes failed:", err);
    return [];
  }
}

export async function getRegistrosPorRango(desde: Date, hasta: Date): Promise<RegistroHistorico[]> {
  try {
    const rows = await query<MasterRow & { id: number }>(
      `SELECT id, sonda_id, eth_download, wifi_download, velocidad_download,
              latitud, longitud, gps_status, ups_estado, ups_nivel, cpu_temp,
              eth_latencia, wifi_latencia, fecha_registro
       FROM registros_ecos_master
       WHERE fecha_registro >= $1 AND fecha_registro <= $2
       ORDER BY fecha_registro DESC
       LIMIT 10000`,
      [desde, hasta]
    );
    return rows.map(rowToRegistro);
  } catch (err) {
    console.error("getRegistrosPorRango failed:", err);
    return [];
  }
}

// Uptime calculation (pure — same logic as before)
export function calcularUptimePorDispositivo(
  registros: RegistroHistorico[]
): Record<string, { cpuId: string; uptime: number; total: number; online: number }> {
  const stats: Record<string, { cpuId: string; total: number; online: number; uptime: number }> = {};
  for (const r of registros) {
    if (!stats[r.cpu_id]) {
      stats[r.cpu_id] = { cpuId: r.cpu_id, total: 0, online: 0, uptime: 100 };
    }
    stats[r.cpu_id].total++;
    if (r.online) stats[r.cpu_id].online++;
  }
  for (const s of Object.values(stats)) {
    s.uptime = s.total > 0 ? Math.round((s.online / s.total) * 1000) / 10 : 100;
  }
  return stats;
}

export function calcularCalidadRed(dispositivos: Dispositivo[]): number {
  if (dispositivos.length === 0) return 0;
  let score = 0;
  for (const d of dispositivos) {
    let s = 0;
    if (d.online) s += 40;
    if (d.download_mbps >= 10) s += 30;
    else if (d.download_mbps >= 5) s += 20;
    else if (d.download_mbps >= 1) s += 10;
    if (d.web_check_mined === "ACCESIBLE") s += 15;
    if (d.web_check_adultos === "BLOQUEADO") s += 15;
    score += s;
  }
  return Math.round(score / dispositivos.length);
}
