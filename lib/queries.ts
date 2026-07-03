import { query } from "./postgres";
import type { Dispositivo, Escuela, RegistroHistorico } from "./firebase";

// Consider a sonda "online" if it reported within the last 5 minutes
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

type MasterRow = {
  sonda_id: string;
  codigo_mined: string | null;
  eth_download: number | null;
  wifi_download: number | null;
  eth_upload: number | null;
  wifi_upload: number | null;
  latitud: number | null;
  longitud: number | null;
  gps_status: string | null;
  ups_estado: string | null;
  ups_nivel: number | null;
  cpu_temp: number | null;
  cpu_uso: number | null;
  ram_uso: number | null;
  eth_latencia: number | null;
  wifi_latencia: number | null;
  fecha_registro: Date;
};

const MASTER_COLS =
  "sonda_id, codigo_mined, eth_download, wifi_download, eth_upload, wifi_upload, " +
  "latitud, longitud, gps_status, ups_estado, ups_nivel, cpu_temp, " +
  "cpu_uso, ram_uso, eth_latencia, wifi_latencia, fecha_registro";

// Traduce el código NUT de la UPS a una etiqueta legible en español.
function upsEstadoLabel(estado: string | null): string {
  const raw = (estado ?? "").trim();
  const code = raw.toUpperCase();
  if (code.startsWith("OB")) return "En batería";
  if (code.startsWith("OL")) return "En línea";
  if (raw === "Driver not connected") return "Sin comunicación";
  if (raw === "Data stale") return "Datos desactualizados";
  if (raw === "") return "Sin datos";
  return raw;
}

function rowToDispositivo(r: MasterRow, webChecks: Map<string, Record<string, string>>): Dispositivo {
  const now = Date.now();
  const ts = r.fecha_registro.getTime();
  // Activa solo si reportó hace poco Y la descarga total (eth + wifi) es > 1 Mbps.
  // Si la suma es <= 1 (incluye -1 = sin medición, 0, o velocidad ínfima), se considera inactiva.
  const reporteReciente = now - ts < ONLINE_WINDOW_MS;
  const descargaTotal = Number(r.eth_download ?? 0) + Number(r.wifi_download ?? 0);
  const online = reporteReciente && descargaTotal > 1;
  const checks = webChecks.get(r.sonda_id) || {};
  const seconds = Math.floor(ts / 1000);
  const nanoseconds = (ts % 1000) * 1_000_000;
  const ultimo_reporte = {
    toDate: () => new Date(ts),
    seconds,
    nanoseconds,
  } as import("./firebase").DbTimestamp;

  const eth = Number(r.eth_download ?? 0);
  const wifi = Number(r.wifi_download ?? 0);

  // UPS: la sonda reporta códigos NUT estándar (no "CON_LUZ"). OL* = en línea (con corriente),
  // OB* = en batería (corte de luz). "Driver not connected"/null = la UPS no responde.
  const upsCode = (r.ups_estado ?? "").trim().toUpperCase();
  const upsEnLinea = upsCode.startsWith("OL");
  const upsEnBateria = upsCode.startsWith("OB");

  return {
    id: r.sonda_id,
    cpu_id: r.sonda_id,
    codigo_mined: r.codigo_mined ?? "",
    id_hardware: r.sonda_id,
    version_sonda: "ecos",
    online,
    ultimo_reporte,
    download_mbps: Math.max(eth, wifi),
    eth_download_mbps: eth,
    wifi_download_mbps: wifi,
    latitud: Number(r.latitud ?? 0),
    longitud: Number(r.longitud ?? 0),
    gps_status: r.gps_status ?? "SIN_SENAL",
    cpu_usage: Number(r.cpu_uso ?? 0),
    ram_usage: Number(r.ram_uso ?? 0),
    disk_usage: 0,
    temp_cpu: r.cpu_temp != null ? String(r.cpu_temp) : "N/A",
    eth_latencia_ms: Number(r.eth_latencia ?? 0),
    wifi_latencia_ms: Number(r.wifi_latencia ?? 0),
    web_check_mined: checks.MINED ?? (online ? "ACCESIBLE" : "SIN_CONEXION"),
    web_check_streaming: checks.Netflix ?? checks.STREAMING ?? (online ? "ACCESIBLE" : "SIN_CONEXION"),
    web_check_adultos: checks.Adultos ?? checks.ADULTOS ?? (online ? "BLOQUEADO" : "SIN_CONEXION"),
    web_check_apuestas: checks.Apuestas ?? checks.APUESTAS ?? (online ? "BLOQUEADO" : "SIN_CONEXION"),
    ups_status: upsEstadoLabel(r.ups_estado),
    ups_nivel: Number(r.ups_nivel ?? 0),
    ups_conectada: upsEnLinea,
    ups_modo: upsEnBateria ? "BATERIA" : "LINEA",
    link_rpi_connect: "",
    alerta_enviada: false,
    ticket_activo: !online,
  };
}

async function getLatestWebChecks(): Promise<Map<string, Record<string, string>>> {
  const map = new Map<string, Record<string, string>>();
  try {
    // Sin WHERE de fecha: el índice (sonda_id, sitio_nombre, fecha_registro DESC) hace el
    // DISTINCT ON directo (toma la última fila por grupo) sin escanear toda la tabla. El
    // WHERE por fecha impedía que el planner usara el índice y se cortaba a los 15s.
    const rows = await query<{ sonda_id: string; sitio_nombre: string; estado_acceso: string }>(
      `SELECT DISTINCT ON (sonda_id, sitio_nombre) sonda_id, sitio_nombre, estado_acceso
       FROM resultados_detallados_web
       ORDER BY sonda_id, sitio_nombre, fecha_registro DESC`
    );
    for (const r of rows) {
      if (!map.has(r.sonda_id)) map.set(r.sonda_id, {});
      map.get(r.sonda_id)![r.sitio_nombre] = r.estado_acceso;
    }
  } catch (err) {
    console.error("getLatestWebChecks failed (se ignora):", err);
  }
  return map;
}

// Columnas reales de la tabla `escuelas` (cacheado en memoria del módulo).
let escuelasColsCache: Set<string> | null = null;
async function getEscuelasCols(): Promise<Set<string>> {
  if (escuelasColsCache) return escuelasColsCache;
  try {
    const rows = await query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'escuelas'`,
    );
    escuelasColsCache = new Set(rows.map((r) => r.column_name.toLowerCase()));
  } catch (err) {
    console.error("getEscuelasCols failed:", err);
    escuelasColsCache = new Set();
  }
  return escuelasColsCache;
}

// Estado por sonda desde la TELEMETRÍA (registros_ecos_master): es la única fuente del
// estado real (online/velocidad). La tabla `escuelas` solo tiene inventario (nombre/coords),
// que se resuelve aparte en getEscuelas. Acotado a las últimas 24h para no escanear toda la
// historia (con el índice (sonda_id, fecha_registro) esto corre en ms).
export async function getDispositivos(): Promise<Dispositivo[]> {
  try {
    // Loose index scan (skip scan emulado): la CTE recursiva recorre SOLO los sonda_id distintos
    // (~184) usando idx_master_sonda_fecha (sonda_id, fecha DESC) — sin escanear toda la tabla —,
    // y por cada sonda hace un seek LIMIT 1 a su última fila. Cubre TODAS las sondas que han
    // reportado (no depende de `escuelas`, así no se pierden sondas recién instaladas). Medido:
    // ~35ms y 184 filas, vs. ~350ms/531ms del DISTINCT ON con ventana de 24h (que además omitía
    // sondas silenciosas >24h). Las sondas sin reporte reciente salen offline vía rowToDispositivo.
    const rows = await query<MasterRow>(
      `WITH RECURSIVE sondas AS (
         (SELECT sonda_id FROM registros_ecos_master WHERE sonda_id IS NOT NULL ORDER BY sonda_id LIMIT 1)
         UNION ALL
         SELECT (SELECT r.sonda_id FROM registros_ecos_master r
                 WHERE r.sonda_id > s.sonda_id AND r.sonda_id IS NOT NULL
                 ORDER BY r.sonda_id LIMIT 1)
         FROM sondas s WHERE s.sonda_id IS NOT NULL
       )
       SELECT m.* FROM sondas s
       CROSS JOIN LATERAL (
         SELECT ${MASTER_COLS}
         FROM registros_ecos_master r
         WHERE r.sonda_id = s.sonda_id
         ORDER BY r.fecha_registro DESC
         LIMIT 1
       ) m
       WHERE s.sonda_id IS NOT NULL`
    );
    const webChecks = await getLatestWebChecks();
    return rows.map((r) => rowToDispositivo(r, webChecks));
  } catch (err) {
    console.error("getDispositivos failed:", err);
    return [];
  }
}

// Inventario de escuelas (nombre + coords). Camino RÁPIDO: tabla `escuelas` real.
// Fallback: sintetizar desde registros_ecos_master (más lento) si la tabla no sirve.
export async function getEscuelas(): Promise<Record<string, Escuela>> {
  const buildEscuela = (sonda: string, nombre: string, lat: number, lng: number, cod: string, departamento?: string): Escuela => ({
    id: sonda,
    nombre_escuela: nombre,
    contacto_principal: "", tel_principal: "", email_principal: "",
    contacto_secundario: "", tel_secundario: "", email_secundario: "",
    direccion: "",
    latitud_fija: lat,
    longitud_fija: lng,
    departamento,
    conectividad: "Dual-link",
    cod_ce: cod,
  });

  try {
    const cols = await getEscuelasCols();
    if (cols.has("sonda_id")) {
      const want = ["sonda_id", "nombre_escuela", "codigo_mined", "departamento", "lat", "lon"];
      const sel = want.filter((c) => cols.has(c));
      const rows = await query<Record<string, unknown>>(
        `SELECT ${sel.map((c) => `"${c}"`).join(", ")} FROM escuelas WHERE sonda_id IS NOT NULL`,
      );
      if (rows.length) {
        const map: Record<string, Escuela> = {};
        for (const r of rows) {
          const sonda = String(r.sonda_id ?? "");
          if (!sonda) continue;
          map[sonda] = buildEscuela(
            sonda,
            String(r.nombre_escuela ?? sonda),
            Number(r.lat ?? 0),
            Number(r.lon ?? 0),
            String(r.codigo_mined ?? sonda),
            String(r.departamento ?? "") || undefined,
          );
        }
        return map;
      }
    }
  } catch (err) {
    console.error("getEscuelas (tabla) failed, fallback:", err);
  }

  // Fallback: sintetizar desde la telemetría, acotado a 24h (datos calientes, rápido).
  try {
    const rows = await query<{ sonda_id: string; latitud: number | null; longitud: number | null }>(
      `SELECT DISTINCT ON (sonda_id) sonda_id, latitud, longitud
       FROM registros_ecos_master
       WHERE sonda_id IS NOT NULL
         AND fecha_registro >= NOW() - INTERVAL '24 hours'
       ORDER BY sonda_id, fecha_registro DESC`
    );
    const map: Record<string, Escuela> = {};
    for (const r of rows) {
      map[r.sonda_id] = buildEscuela(
        r.sonda_id,
        r.sonda_id.replace(/_/g, " "),
        Number(r.latitud ?? 0),
        Number(r.longitud ?? 0),
        r.sonda_id,
      );
    }
    return map;
  } catch (err) {
    console.error("getEscuelas failed:", err);
    return {};
  }
}

// Coordenadas REALES de cada escuela desde la tabla `escuelas`, indexadas por
// código MINED. El mapa ubica cada sonda por su codigo_mined contra este mapa
// (en vez de apilar las que no tienen GPS en coordenadas "demo").
export async function getCoordsEscuelas(): Promise<
  Record<string, { nombre: string; lat: number; lng: number }>
> {
  try {
    const rows = await query<{
      codigo_mined: string | null;
      nombre_escuela: string | null;
      lat: string | number | null;
      lon: string | number | null;
    }>(
      `SELECT codigo_mined, nombre_escuela, lat, lon
       FROM escuelas
       WHERE codigo_mined IS NOT NULL AND lat IS NOT NULL AND lon IS NOT NULL`,
    );
    const map: Record<string, { nombre: string; lat: number; lng: number }> = {};
    for (const r of rows) {
      const codigo = String(r.codigo_mined ?? "").trim();
      const lat = Number(r.lat);
      const lng = Number(r.lon);
      if (!codigo || !Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) continue;
      map[codigo] = { nombre: r.nombre_escuela || codigo, lat, lng };
    }
    return map;
  } catch (err) {
    console.error("getCoordsEscuelas failed:", err);
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

  const eth = Number(r.eth_download ?? 0);
  const wifi = Number(r.wifi_download ?? 0);
  return {
    id: String(r.id),
    cpu_id: r.sonda_id,
    download_mbps: Math.max(eth, wifi),
    eth_download_mbps: eth,
    wifi_download_mbps: wifi,
    latitud: Number(r.latitud ?? 0),
    longitud: Number(r.longitud ?? 0),
    online,
    web_check_mined: online ? "ACCESIBLE" : "SIN_CONEXION",
    web_check_streaming: online ? "ACCESIBLE" : "SIN_CONEXION",
    web_check_adultos: online ? "BLOQUEADO" : "SIN_CONEXION",
    web_check_apuestas: online ? "BLOQUEADO" : "SIN_CONEXION",
    ups_status: upsEstadoLabel(r.ups_estado),
    ups_nivel: Number(r.ups_nivel ?? 0),
    cpu_usage: Number(r.cpu_uso ?? 0),
    ram_usage: Number(r.ram_uso ?? 0),
    timestamp,
  };
}

export async function getRegistrosDispositivo(cpuId: string, limite = 100): Promise<RegistroHistorico[]> {
  try {
    const rows = await query<MasterRow & { id: number }>(
      `SELECT id, ${MASTER_COLS}
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

// Velocidad agregada por intervalos de tiempo (buckets), promediando en SQL.
// Escala a miles de sondas: devuelve ~1 punto por bucket (p.ej. 144 en 12h a 5 min),
// en vez de traer filas crudas que se truncan con el LIMIT. Sin sondaId agrega TODAS
// las sondas (promedio de red); con sondaId, solo esa sonda.
export async function getVelocidadBuckets(
  horas = 12,
  sondaId?: string,
  bucketMin = 5,
  sondaIds?: string[],
): Promise<{ ts: number; descarga: number; subida: number }[]> {
  try {
    const bucketSec = bucketMin * 60;
    // Rango relativo al ÚLTIMO dato real (MAX fecha_registro), no al reloj del server:
    // las sondas guardan hora local (naive) y NOW() es UTC, así que restar horas al reloj
    // capturaba mal el rango (solo salía un tramo). Usar MAX evita ese desfase de zona horaria.
    const params: unknown[] = [bucketSec, horas];
    let sondaFilter = "";
    const ids = sondaIds?.filter(Boolean);
    if (sondaIds && !ids?.length) return [];
    if (ids?.length) {
      params.push(ids);
      sondaFilter = `AND sonda_id = ANY($${params.length}::text[])`;
    } else if (sondaId) {
      params.push(sondaId);
      sondaFilter = `AND sonda_id = $${params.length}`;
    }
    const rows = await query<{ bucket: Date; descarga: string | null; subida: string | null }>(
      `SELECT to_timestamp(floor(extract(epoch from fecha_registro) / $1) * $1) AS bucket,
              AVG(eth_download) FILTER (WHERE eth_download > 0) AS descarga,
              AVG(wifi_download) FILTER (WHERE wifi_download > 0) AS subida
       FROM registros_ecos_master
       WHERE fecha_registro >= (SELECT MAX(fecha_registro) FROM registros_ecos_master) - ($2 * INTERVAL '1 hour') ${sondaFilter}
       GROUP BY 1
       ORDER BY 1`,
      params,
    );
    return rows.map((r) => ({
      ts: (r.bucket instanceof Date ? r.bucket : new Date(r.bucket as unknown as string)).getTime(),
      descarga: Number(r.descarga ?? 0),
      subida: Number(r.subida ?? 0),
    }));
  } catch (err) {
    console.error("getVelocidadBuckets failed:", err);
    return [];
  }
}

export async function getRegistrosRecientes(limite = 3000, horas = 12): Promise<RegistroHistorico[]> {
  try {
    const cutoff = new Date(Date.now() - horas * 60 * 60 * 1000);
    const rows = await query<MasterRow & { id: number }>(
      `SELECT id, ${MASTER_COLS}
       FROM registros_ecos_master
       WHERE fecha_registro >= $1
       ORDER BY fecha_registro DESC
       LIMIT $2`,
      [cutoff, limite]
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
      `SELECT id, ${MASTER_COLS}
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
