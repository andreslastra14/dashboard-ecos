import { getDb, type Registro } from "./firebase";

const MAX_SCAN = 500;

export async function getUltimosRegistros(limite = 100): Promise<Registro[]> {
  try {
    const db = getDb();
    const snap = await db
      .collection("registros")
      .orderBy("timestamp", "desc")
      .limit(limite)
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Registro));
  } catch (err) {
    console.error("Firestore getUltimosRegistros failed:", err);
    return [];
  }
}

export async function getUltimosPorSonda(): Promise<Record<string, Registro>> {
  try {
    const registros = await getUltimosRegistros(MAX_SCAN);
    const map: Record<string, Registro> = {};
    for (const r of registros) {
      if (!map[r.serie]) map[r.serie] = r;
    }
    if (registros.length >= MAX_SCAN) {
      console.warn(
        `getUltimosPorSonda: scanned ${MAX_SCAN} docs — some probes may be missing. Consider a dedicated latest-record collection.`
      );
    }
    return map;
  } catch (err) {
    console.error("Firestore getUltimosPorSonda failed:", err);
    return {};
  }
}

export async function getRegistrosSonda(
  serie: string,
  limite = 100
): Promise<Registro[]> {
  try {
    const db = getDb();
    const snap = await db
      .collection("registros")
      .where("serie", "==", serie)
      .orderBy("timestamp", "desc")
      .limit(limite)
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Registro));
  } catch (err) {
    console.error("Firestore getRegistrosSonda failed:", err);
    return [];
  }
}

// Uses records already fetched by getUltimosPorSonda to avoid duplicate scans.
// Pass the porSonda map to filter instead of calling Firestore again.
export function getAlertasDeRegistros(
  registros: Registro[],
  limite = 50
): Registro[] {
  return registros.filter((r) => r.status === "FALLA_RED").slice(0, limite);
}

// Standalone query for pages that only need alerts (uses composite index).
// Requires Firestore index: { status ASC, timestamp DESC }
// Create at: https://console.firebase.google.com/project/_/firestore/indexes
export async function getAlertas(limite = 50): Promise<Registro[]> {
  try {
    const db = getDb();
    const snap = await db
      .collection("registros")
      .where("status", "==", "FALLA_RED")
      .orderBy("timestamp", "desc")
      .limit(limite)
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Registro));
  } catch (err) {
    // Fallback: index may not exist yet — scan in memory
    console.warn("getAlertas composite index missing, falling back to scan:", err);
    const todos = await getUltimosRegistros(MAX_SCAN);
    return todos.filter((r) => r.status === "FALLA_RED").slice(0, limite);
  }
}

// Calculate uptime percentage per sonda from recent records
export function calcularUptimePorSonda(registros: Registro[]): Record<string, { serie: string; dispositivo: string; uptime: number; total: number; ok: number }> {
  const stats: Record<string, { serie: string; dispositivo: string; total: number; ok: number; uptime: number }> = {};
  for (const r of registros) {
    if (!stats[r.serie]) {
      stats[r.serie] = { serie: r.serie, dispositivo: r.dispositivo, total: 0, ok: 0, uptime: 100 };
    }
    stats[r.serie].total++;
    if (r.status === "OK") stats[r.serie].ok++;
  }
  for (const s of Object.values(stats)) {
    s.uptime = s.total > 0 ? Math.round((s.ok / s.total) * 1000) / 10 : 100;
  }
  return stats;
}

// Calculate network quality score (0-100) based on latency, speed, uptime
export function calcularCalidadRed(registros: Registro[]): number {
  if (registros.length === 0) return 0;
  const recientes = registros.slice(0, 50);

  let latenciaScore = 0, speedScore = 0, uptimeScore = 0;
  let count = 0;

  for (const r of recientes) {
    if (r.status === "OK") uptimeScore++;
    const lat = r.pings?.mined ?? -1;
    if (lat > 0 && lat <= 50) latenciaScore += 1;
    else if (lat > 50 && lat <= 150) latenciaScore += 0.7;
    else if (lat > 150 && lat <= 300) latenciaScore += 0.3;

    if (r.download_mbps >= 10) speedScore += 1;
    else if (r.download_mbps >= 5) speedScore += 0.7;
    else if (r.download_mbps >= 1) speedScore += 0.3;
    count++;
  }

  if (count === 0) return 0;
  const upPct = (uptimeScore / count) * 40;
  const latPct = (latenciaScore / count) * 30;
  const spdPct = (speedScore / count) * 30;
  return Math.round(upPct + latPct + spdPct);
}

// ── Advanced Insights ──────────────────────────────────────

export interface InsightsData {
  filtroBypassCount: number;      // Sondas donde el filtro de contenido NO bloquea
  filtroTotalCount: number;       // Total de sondas analizadas para filtro
  peorSonda: { serie: string; dispositivo: string; uptime: number } | null;
  mejorSonda: { serie: string; dispositivo: string; uptime: number } | null;
  horasPico: string;              // Hora con más fallas
  sondasEnRiesgo: number;         // Latencia >150ms o download <5Mbps
  promedioFallasPorDia: number;   // Fallas promedio estimadas por día
  minedInaccesible: number;       // Sondas sin acceso al portal MINED
}

export function calcularInsights(registros: Registro[], porSonda: Record<string, Registro>): InsightsData {
  const sondas = Object.values(porSonda);

  // Filtro de contenido bypass: pings.restringido > 0 significa que el sitio SÍ respondió (filtro no funciona)
  const filtroTotalCount = sondas.filter(r => r.pings?.restringido !== undefined).length;
  const filtroBypassCount = sondas.filter(r => r.pings?.restringido > 0).length;

  // MINED inaccesible
  const minedInaccesible = sondas.filter(r => (r.pings?.mined ?? -1) <= 0).length;

  // Sondas en riesgo: latencia alta O velocidad baja
  const sondasEnRiesgo = sondas.filter(r => {
    const latAlta = (r.pings?.mined ?? 0) > 150;
    const velBaja = r.download_mbps > 0 && r.download_mbps < 5;
    return r.status === "OK" && (latAlta || velBaja);
  }).length;

  // Mejor y peor sonda por uptime
  const uptimeStats = calcularUptimePorSonda(registros);
  const uptimeArr = Object.values(uptimeStats).filter(s => s.total >= 5);
  uptimeArr.sort((a, b) => a.uptime - b.uptime);
  const peorSonda = uptimeArr.length > 0
    ? { serie: uptimeArr[0].serie, dispositivo: uptimeArr[0].dispositivo, uptime: uptimeArr[0].uptime }
    : null;
  const mejorSonda = uptimeArr.length > 0
    ? { serie: uptimeArr[uptimeArr.length - 1].serie, dispositivo: uptimeArr[uptimeArr.length - 1].dispositivo, uptime: uptimeArr[uptimeArr.length - 1].uptime }
    : null;

  // Hora pico de fallas
  const fallasPorHora: Record<string, number> = {};
  for (const r of registros) {
    if (r.status === "FALLA_RED" && r.fecha) {
      const hora = r.fecha.slice(11, 13) || "??";
      fallasPorHora[hora] = (fallasPorHora[hora] || 0) + 1;
    }
  }
  const horasPico = Object.entries(fallasPorHora).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  // Promedio de fallas por día (estimado de los registros disponibles)
  const totalFallas = registros.filter(r => r.status === "FALLA_RED").length;
  const fechasUnicas = new Set(registros.map(r => r.fecha?.slice(0, 10)).filter(Boolean));
  const dias = Math.max(fechasUnicas.size, 1);
  const promedioFallasPorDia = Math.round(totalFallas / dias);

  return {
    filtroBypassCount,
    filtroTotalCount,
    peorSonda,
    mejorSonda,
    horasPico: horasPico !== "—" ? `${horasPico}:00` : "—",
    sondasEnRiesgo,
    promedioFallasPorDia,
    minedInaccesible,
  };
}
