import { getDb, type Dispositivo, type Escuela, type RegistroHistorico } from "./firebase";

// Get all active devices (latest state)
export async function getDispositivos(): Promise<Dispositivo[]> {
  try {
    const db = getDb();
    const snap = await db.collection("dispositivos").get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Dispositivo));
  } catch (err) {
    console.error("getDispositivos failed:", err);
    return [];
  }
}

// Get school inventory
export async function getEscuelas(): Promise<Record<string, Escuela>> {
  try {
    const db = getDb();
    const snap = await db.collection("Inventario_Sondas").get();
    const map: Record<string, Escuela> = {};
    for (const doc of snap.docs) {
      const data = doc.data();
      // Clean doc ID (some have trailing quotes from bad import)
      const cleanId = doc.id.replace(/"/g, "").trim();
      map[cleanId] = {
        id: cleanId,
        nombre_escuela: data.nombre_escuela || "Sin nombre",
        contacto_principal: data.contacto_principal || "",
        tel_principal: data.tel_principal || "",
        email_principal: data.email_principal || "",
        contacto_secundario: data.contacto_secundario || "",
        tel_secundario: data.tel_secundario || "",
        email_secundario: data.email_secundario || "",
        direccion: data.direccion || "",
        latitud_fija: data.latitud_fija || 0,
        longitud_fija: data.longitud_fija || 0,
        conectividad: data.conectividad || "",
        cod_ce: data["COD CE"] || "",
      } as Escuela;
    }
    return map;
  } catch (err) {
    console.error("getEscuelas failed:", err);
    return {};
  }
}

// Get historical records for a specific device
// Filters in memory to avoid composite index requirement (cpu_id + timestamp)
export async function getRegistrosDispositivo(cpuId: string, limite = 100): Promise<RegistroHistorico[]> {
  try {
    const todos = await getRegistrosRecientes(500);
    return todos.filter((r) => r.cpu_id === cpuId).slice(0, limite);
  } catch (err) {
    console.error("getRegistrosDispositivo failed:", err);
    return [];
  }
}

// Get recent historical records (all devices)
export async function getRegistrosRecientes(limite = 200): Promise<RegistroHistorico[]> {
  try {
    const db = getDb();
    const snap = await db.collection("registros")
      .orderBy("timestamp", "desc")
      .limit(limite)
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as RegistroHistorico));
  } catch (err) {
    console.error("getRegistrosRecientes failed:", err);
    return [];
  }
}

// Get historical records filtered by date range (all devices)
export async function getRegistrosPorRango(desde: Date, hasta: Date): Promise<RegistroHistorico[]> {
  try {
    const db = getDb();
    const { Timestamp } = await import("firebase-admin/firestore");
    const snap = await db
      .collection("registros")
      .where("timestamp", ">=", Timestamp.fromDate(desde))
      .where("timestamp", "<=", Timestamp.fromDate(hasta))
      .orderBy("timestamp", "desc")
      .limit(10000)
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as RegistroHistorico));
  } catch (err) {
    console.error("getRegistrosPorRango failed:", err);
    return [];
  }
}

// Calculate uptime per device from historical records
export function calcularUptimePorDispositivo(registros: RegistroHistorico[]): Record<string, { cpuId: string; uptime: number; total: number; online: number }> {
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

// Calculate network quality score (0-100)
export function calcularCalidadRed(dispositivos: Dispositivo[]): number {
  if (dispositivos.length === 0) return 0;
  let score = 0;
  for (const d of dispositivos) {
    let s = 0;
    // Online = 40 points
    if (d.online) s += 40;
    // Speed: 30 points
    if (d.download_mbps >= 10) s += 30;
    else if (d.download_mbps >= 5) s += 20;
    else if (d.download_mbps >= 1) s += 10;
    // MINED accessible: 15 points
    if (d.web_check_mined === "ACCESIBLE") s += 15;
    // Content filter working: 15 points
    if (d.web_check_adultos === "BLOQUEADO") s += 15;
    score += s;
  }
  return Math.round(score / dispositivos.length);
}
