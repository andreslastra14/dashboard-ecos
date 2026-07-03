import { unstable_cache } from "next/cache";
import { query } from "./postgres";
import type { DbTimestamp, Dispositivo, Escuela, RegistroHistorico } from "./firebase";

// Consider a sonda "online" if it reported within the last 5 minutes
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

// El layout y las páginas llaman estas consultas en CADA request (las rutas del
// dashboard son dinámicas por la cookie de sesión, así que el `revalidate` de
// página no aplica). unstable_cache corre la consulta pesada 1 vez por minuto;
// el resto de requests sirve del data cache y navegar queda fluido.
const CACHE_REVALIDATE_S = 60;

// unstable_cache serializa el resultado: métodos como toDate() NO sobreviven.
// Las funciones cacheadas devuelven epoch ms planos y los exports públicos
// rehidratan el DbTimestamp (lib/sla.ts y lib/pdf hacen `"toDate" in ts` y
// caerían a 0 en silencio si el método se pierde).
type DispositivoCacheado = Omit<Dispositivo, "ultimo_reporte"> & { ultimo_reporte_ms: number };
type RegistroCacheado = Omit<RegistroHistorico, "timestamp"> & { timestamp_ms: number };

function makeDbTimestamp(ms: number): DbTimestamp {
  return {
    toDate: () => new Date(ms),
    seconds: Math.floor(ms / 1000),
    nanoseconds: (ms % 1000) * 1_000_000,
  };
}

function hydrateDispositivo({ ultimo_reporte_ms, ...d }: DispositivoCacheado): Dispositivo {
  return { ...d, ultimo_reporte: makeDbTimestamp(ultimo_reporte_ms) };
}

function hydrateRegistro({ timestamp_ms, ...r }: RegistroCacheado): RegistroHistorico {
  return { ...r, timestamp: makeDbTimestamp(timestamp_ms) };
}

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

function rowToDispositivo(r: MasterRow, webChecks: Map<string, Record<string, string>>): DispositivoCacheado {
  const now = Date.now();
  const ts = r.fecha_registro.getTime();
  // Activa solo si reportó hace poco Y la descarga total (eth + wifi) es > 1 Mbps.
  // Si la suma es <= 1 (incluye -1 = sin medición, 0, o velocidad ínfima), se considera inactiva.
  const reporteReciente = now - ts < ONLINE_WINDOW_MS;
  const descargaTotal = Number(r.eth_download ?? 0) + Number(r.wifi_download ?? 0);
  const online = reporteReciente && descargaTotal > 1;
  const checks = webChecks.get(r.sonda_id) || {};

  const eth = Number(r.eth_download ?? 0);
  const wifi = Number(r.wifi_download ?? 0);
  return {
    id: r.sonda_id,
    cpu_id: r.sonda_id,
    codigo_mined: r.codigo_mined ?? "",
    id_hardware: r.sonda_id,
    version_sonda: "ecos",
    online,
    ultimo_reporte_ms: ts,
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
  const map = new Map<string, Record<string, string>>();
  try {
    // Acotado a 24h: solo datos calientes (rápido, sin escanear toda la historia).
    const rows = await query<{ sonda_id: string; sitio_nombre: string; estado_acceso: string }>(
      `SELECT DISTINCT ON (sonda_id, sitio_nombre) sonda_id, sitio_nombre, estado_acceso
       FROM resultados_detallados_web
       WHERE fecha_registro >= NOW() - INTERVAL '24 hours'
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
  } catch {
    escuelasColsCache = new Set();
  }
  return escuelasColsCache;
}

// Mapea una fila de la tabla `escuelas` (estado YA calculado) a Dispositivo.
function escuelaRowToDispositivo(r: Record<string, unknown>): DispositivoCacheado {
  const sonda = String(r.sonda_id ?? r.codigo_mined ?? "");
  const online = String(r.estado_red ?? "").toUpperCase() === "OK";
  const vel = Number(r.velocidad_promedio ?? 0) || 0;
  const upsConectada = r.ups_conectada === true;
  return {
    id: sonda,
    cpu_id: sonda,
    codigo_mined: String(r.codigo_mined ?? ""),
    id_hardware: sonda,
    version_sonda: "ecos",
    online,
    ultimo_reporte_ms: Date.now(),
    download_mbps: vel,
    eth_download_mbps: vel,
    wifi_download_mbps: 0,
    latitud: Number(r.lat ?? 0),
    longitud: Number(r.lon ?? 0),
    gps_status: "N/A",
    cpu_usage: 0,
    ram_usage: 0,
    disk_usage: 0,
    temp_cpu: "N/A",
    eth_latencia_ms: 0,
    wifi_latencia_ms: 0,
    web_check_mined: online ? "ACCESIBLE" : "SIN_CONEXION",
    web_check_streaming: online ? "ACCESIBLE" : "SIN_CONEXION",
    web_check_adultos: online ? "BLOQUEADO" : "SIN_CONEXION",
    web_check_apuestas: online ? "BLOQUEADO" : "SIN_CONEXION",
    ups_status: upsConectada ? "CON_LUZ" : "NORMAL",
    ups_nivel: 0,
    ups_conectada: upsConectada,
    ups_modo: "LINEA",
    link_rpi_connect: "",
    alerta_enviada: false,
    ticket_activo: !online,
  };
}

// Estado por sonda. Camino RÁPIDO: tabla `escuelas` (estado materializado, O(#escuelas)).
// Si no tiene las columnas necesarias o falla, cae a la telemetría cruda (más lento).
async function getDispositivosRaw(): Promise<DispositivoCacheado[]> {
  try {
    const cols = await getEscuelasCols();
    if (cols.has("sonda_id") && cols.has("estado_red")) {
      const want = ["sonda_id", "estado_red", "nombre_escuela", "codigo_mined", "velocidad_promedio", "ups_conectada", "lat", "lon"];
      const sel = want.filter((c) => cols.has(c));
      const rows = await query<Record<string, unknown>>(
        `SELECT ${sel.map((c) => `"${c}"`).join(", ")} FROM escuelas WHERE sonda_id IS NOT NULL`,
      );
      if (rows.length) return rows.map(escuelaRowToDispositivo);
    }
  } catch (err) {
    console.error("getDispositivos (escuelas) failed, fallback a master:", err);
  }
  // Fallback: telemetría cruda de registros_ecos_master. ACOTADO a 24h: el DISTINCT ON
  // sin filtro de fecha escaneaba TODA la historia (lento, se colgaba); con la ventana
  // reciente solo toca datos calientes (~ms) y captura toda sonda que reportó en 24h.
  try {
    const rows = await query<MasterRow>(
      `SELECT DISTINCT ON (sonda_id) ${MASTER_COLS}
       FROM registros_ecos_master
       WHERE sonda_id IS NOT NULL
         AND fecha_registro >= NOW() - INTERVAL '24 hours'
       ORDER BY sonda_id, fecha_registro DESC`
    );
    const webChecks = await getLatestWebChecks();
    return rows.map((r) => rowToDispositivo(r, webChecks));
  } catch (err) {
    console.error("getDispositivos failed:", err);
    return [];
  }
}

const getDispositivosCached = unstable_cache(getDispositivosRaw, ["dispositivos"], {
  revalidate: CACHE_REVALIDATE_S,
  tags: ["dispositivos"],
});

export async function getDispositivos(): Promise<Dispositivo[]> {
  return (await getDispositivosCached()).map(hydrateDispositivo);
}

// Inventario de escuelas (nombre + coords). Camino RÁPIDO: tabla `escuelas` real.
// Fallback: sintetizar desde registros_ecos_master (más lento) si la tabla no sirve.
async function getEscuelasRaw(): Promise<Record<string, Escuela>> {
  const buildEscuela = (sonda: string, nombre: string, lat: number, lng: number, cod: string): Escuela => ({
    id: sonda,
    nombre_escuela: nombre,
    contacto_principal: "", tel_principal: "", email_principal: "",
    contacto_secundario: "", tel_secundario: "", email_secundario: "",
    direccion: "",
    latitud_fija: lat,
    longitud_fija: lng,
    conectividad: "Dual-link",
    cod_ce: cod,
  });

  try {
    const cols = await getEscuelasCols();
    if (cols.has("sonda_id")) {
      const want = ["sonda_id", "nombre_escuela", "codigo_mined", "lat", "lon"];
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

// Escuela y las coords son JSON plano (sin métodos): se cachean directo.
export const getEscuelas = unstable_cache(getEscuelasRaw, ["escuelas"], {
  revalidate: CACHE_REVALIDATE_S,
  tags: ["escuelas"],
});

// Coordenadas REALES de cada escuela desde la tabla `escuelas`, indexadas por
// código MINED. El mapa ubica cada sonda por su codigo_mined contra este mapa
// (en vez de apilar las que no tienen GPS en coordenadas "demo").
async function getCoordsEscuelasRaw(): Promise<
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

export const getCoordsEscuelas = unstable_cache(getCoordsEscuelasRaw, ["coords-escuelas"], {
  revalidate: CACHE_REVALIDATE_S,
  tags: ["escuelas"],
});

function rowToRegistro(r: MasterRow & { id: number | string }): RegistroCacheado {
  const ts = r.fecha_registro.getTime();
  const online = true; // historical rows always represent a successful report

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
    ups_status: r.ups_estado ?? "NORMAL",
    ups_nivel: Number(r.ups_nivel ?? 0),
    cpu_usage: Number(r.cpu_uso ?? 0),
    ram_usage: Number(r.ram_uso ?? 0),
    timestamp_ms: ts,
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
    return rows.map((r) => hydrateRegistro(rowToRegistro(r)));
  } catch (err) {
    console.error("getRegistrosDispositivo failed:", err);
    return [];
  }
}

// Velocidad agregada por intervalos de tiempo (buckets), promediando en SQL.
// Escala a miles de sondas: devuelve ~1 punto por bucket (p.ej. 144 en 12h a 5 min),
// en vez de traer filas crudas que se truncan con el LIMIT. Sin sondaId agrega TODAS
// las sondas (promedio de red); con sondaId, solo esa sonda.
async function getVelocidadBucketsRaw(
  horas = 12,
  sondaId?: string,
  bucketMin = 5,
): Promise<{ ts: number; descarga: number; subida: number }[]> {
  try {
    const bucketSec = bucketMin * 60;
    const cutoff = new Date(Date.now() - horas * 60 * 60 * 1000);
    const params: unknown[] = [bucketSec, cutoff];
    let sondaFilter = "";
    if (sondaId) {
      params.push(sondaId);
      sondaFilter = "AND sonda_id = $3";
    }
    const rows = await query<{ bucket: Date; descarga: string | null; subida: string | null }>(
      `SELECT to_timestamp(floor(extract(epoch from fecha_registro) / $1) * $1) AS bucket,
              AVG(eth_download) FILTER (WHERE eth_download > 0) AS descarga,
              AVG(wifi_download) FILTER (WHERE wifi_download > 0) AS subida
       FROM registros_ecos_master
       WHERE fecha_registro >= $2 ${sondaFilter}
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

// Los args (horas, sondaId, bucketMin) entran solos a la cache key.
export const getVelocidadBuckets = unstable_cache(getVelocidadBucketsRaw, ["velocidad-buckets"], {
  revalidate: CACHE_REVALIDATE_S,
  tags: ["registros"],
});

async function getRegistrosRecientesRaw(limite = 3000, horas = 12): Promise<RegistroCacheado[]> {
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

const getRegistrosRecientesCached = unstable_cache(getRegistrosRecientesRaw, ["registros-recientes"], {
  revalidate: CACHE_REVALIDATE_S,
  tags: ["registros"],
});

export async function getRegistrosRecientes(limite = 3000, horas = 12): Promise<RegistroHistorico[]> {
  return (await getRegistrosRecientesCached(limite, horas)).map(hydrateRegistro);
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
    return rows.map((r) => hydrateRegistro(rowToRegistro(r)));
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
