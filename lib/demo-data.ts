// Datos fantasma para la DEMO RapidNet (rama demo-rapidnet).
// Nada aquí toca la base real: genera oficinas ficticias con telemetría
// determinística (PRNG con semilla) + una leve onda temporal para que los
// charts "respiren" entre refresco y refresco.
import type { Dispositivo, Escuela, RegistroHistorico, DbTimestamp } from "./firebase";

// PRNG determinístico (mulberry32)
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ts(ms: number): DbTimestamp {
  return {
    toDate: () => new Date(ms),
    seconds: Math.floor(ms / 1000),
    nanoseconds: (ms % 1000) * 1_000_000,
  };
}

interface Oficina {
  codigo: string;
  nombre: string;
  lat: number;
  lng: number;
  ethBase: number;   // Mbps
  wifiBase: number;  // Mbps
  online: boolean;
  ups: "linea" | "bateria" | "sin";
  bypass?: boolean;  // filtro de contenido vulnerado (para el KPI)
}

// 42 oficinas/sucursales ficticias sobre ciudades reales de El Salvador
const OFICINAS: Oficina[] = [
  { codigo: "10001", nombre: "Oficina Central San Salvador", lat: 13.7010, lng: -89.2244, ethBase: 480, wifiBase: 180, online: true, ups: "linea" },
  { codigo: "10002", nombre: "Data Center Santa Elena", lat: 13.6772, lng: -89.2530, ethBase: 620, wifiBase: 210, online: true, ups: "linea" },
  { codigo: "10003", nombre: "Sucursal Merliot", lat: 13.6800, lng: -89.2790, ethBase: 350, wifiBase: 140, online: true, ups: "linea" },
  { codigo: "10004", nombre: "Sucursal Escalón", lat: 13.7080, lng: -89.2400, ethBase: 320, wifiBase: 120, online: true, ups: "linea" },
  { codigo: "10005", nombre: "Agencia Metrocentro", lat: 13.7060, lng: -89.2130, ethBase: 280, wifiBase: 110, online: true, ups: "bateria" },
  { codigo: "10006", nombre: "Sucursal Soyapango", lat: 13.7100, lng: -89.1400, ethBase: 240, wifiBase: 95, online: true, ups: "linea" },
  { codigo: "10007", nombre: "Agencia Apopa", lat: 13.8070, lng: -89.1790, ethBase: 210, wifiBase: 85, online: true, ups: "linea" },
  { codigo: "10008", nombre: "Sucursal Santa Tecla", lat: 13.6740, lng: -89.2870, ethBase: 300, wifiBase: 125, online: true, ups: "linea" },
  { codigo: "10009", nombre: "Agencia Mejicanos", lat: 13.7400, lng: -89.2130, ethBase: 190, wifiBase: 80, online: false, ups: "sin" },
  { codigo: "10010", nombre: "Sucursal San Marcos", lat: 13.6590, lng: -89.1830, ethBase: 220, wifiBase: 90, online: true, ups: "linea" },
  { codigo: "10011", nombre: "Oficina Ilopango", lat: 13.7020, lng: -89.1090, ethBase: 230, wifiBase: 92, online: true, ups: "linea" },
  { codigo: "10012", nombre: "Agencia Antiguo Cuscatlán", lat: 13.6640, lng: -89.2410, ethBase: 340, wifiBase: 130, online: true, ups: "linea" },
  { codigo: "20001", nombre: "Sucursal Santa Ana Centro", lat: 13.9940, lng: -89.5600, ethBase: 260, wifiBase: 105, online: true, ups: "linea" },
  { codigo: "20002", nombre: "Agencia Metapán", lat: 14.3330, lng: -89.4420, ethBase: 150, wifiBase: 60, online: true, ups: "bateria" },
  { codigo: "20003", nombre: "Oficina Chalchuapa", lat: 13.9860, lng: -89.6810, ethBase: 170, wifiBase: 70, online: true, ups: "linea" },
  { codigo: "20004", nombre: "Agencia El Congo", lat: 13.9060, lng: -89.4990, ethBase: 140, wifiBase: 55, online: false, ups: "sin" },
  { codigo: "21001", nombre: "Sucursal Ahuachapán", lat: 13.9210, lng: -89.8450, ethBase: 160, wifiBase: 65, online: true, ups: "linea" },
  { codigo: "21002", nombre: "Agencia Atiquizaya", lat: 13.9770, lng: -89.7520, ethBase: 130, wifiBase: 52, online: true, ups: "linea" },
  { codigo: "22001", nombre: "Sucursal Sonsonate", lat: 13.7190, lng: -89.7240, ethBase: 200, wifiBase: 82, online: true, ups: "linea" },
  { codigo: "22002", nombre: "Agencia Izalco", lat: 13.7460, lng: -89.6730, ethBase: 145, wifiBase: 58, online: true, ups: "linea" },
  { codigo: "22003", nombre: "Oficina Puerto de Acajutla", lat: 13.5930, lng: -89.8270, ethBase: 175, wifiBase: 72, online: true, ups: "bateria", bypass: true },
  { codigo: "30001", nombre: "Sucursal San Miguel Centro", lat: 13.4830, lng: -88.1770, ethBase: 250, wifiBase: 100, online: true, ups: "linea" },
  { codigo: "30002", nombre: "Agencia Roosevelt San Miguel", lat: 13.4740, lng: -88.1610, ethBase: 230, wifiBase: 94, online: true, ups: "linea" },
  { codigo: "30003", nombre: "Oficina Chinameca", lat: 13.4990, lng: -88.3500, ethBase: 120, wifiBase: 48, online: false, ups: "sin" },
  { codigo: "31001", nombre: "Sucursal Usulután", lat: 13.3440, lng: -88.4500, ethBase: 180, wifiBase: 74, online: true, ups: "linea" },
  { codigo: "31002", nombre: "Agencia Santiago de María", lat: 13.4850, lng: -88.4710, ethBase: 135, wifiBase: 54, online: true, ups: "linea" },
  { codigo: "31003", nombre: "Oficina Jiquilisco", lat: 13.3210, lng: -88.5740, ethBase: 125, wifiBase: 50, online: true, ups: "linea" },
  { codigo: "32001", nombre: "Sucursal La Unión", lat: 13.3370, lng: -87.8440, ethBase: 165, wifiBase: 66, online: true, ups: "linea" },
  { codigo: "32002", nombre: "Agencia Santa Rosa de Lima", lat: 13.6250, lng: -87.8930, ethBase: 128, wifiBase: 51, online: true, ups: "bateria" },
  { codigo: "33001", nombre: "Oficina San Francisco Gotera", lat: 13.6960, lng: -88.1060, ethBase: 118, wifiBase: 47, online: true, ups: "linea" },
  { codigo: "40001", nombre: "Sucursal Zacatecoluca", lat: 13.5000, lng: -88.8690, ethBase: 190, wifiBase: 78, online: true, ups: "linea" },
  { codigo: "40002", nombre: "Agencia Olocuilta", lat: 13.5670, lng: -89.1180, ethBase: 150, wifiBase: 61, online: true, ups: "linea" },
  { codigo: "40003", nombre: "Oficina Costa del Sol", lat: 13.3360, lng: -88.9370, ethBase: 110, wifiBase: 44, online: false, ups: "sin" },
  { codigo: "41001", nombre: "Sucursal San Vicente", lat: 13.6410, lng: -88.7840, ethBase: 170, wifiBase: 68, online: true, ups: "linea" },
  { codigo: "41002", nombre: "Agencia Apastepeque", lat: 13.6660, lng: -88.7540, ethBase: 122, wifiBase: 49, online: true, ups: "linea" },
  { codigo: "42001", nombre: "Sucursal Cojutepeque", lat: 13.7170, lng: -88.9330, ethBase: 185, wifiBase: 76, online: true, ups: "linea" },
  { codigo: "42002", nombre: "Oficina Suchitoto", lat: 13.9380, lng: -89.0280, ethBase: 132, wifiBase: 53, online: true, ups: "linea" },
  { codigo: "43001", nombre: "Sucursal Sensuntepeque", lat: 13.8800, lng: -88.6300, ethBase: 126, wifiBase: 50, online: true, ups: "bateria" },
  { codigo: "43002", nombre: "Agencia Ilobasco", lat: 13.8420, lng: -88.8500, ethBase: 138, wifiBase: 56, online: true, ups: "linea" },
  { codigo: "44001", nombre: "Sucursal Chalatenango", lat: 14.0330, lng: -88.9350, ethBase: 144, wifiBase: 58, online: true, ups: "linea" },
  { codigo: "44002", nombre: "Agencia Nueva Concepción", lat: 14.1250, lng: -89.2930, ethBase: 116, wifiBase: 46, online: true, ups: "linea" },
  { codigo: "45001", nombre: "Oficina La Palma", lat: 14.3170, lng: -89.1610, ethBase: 105, wifiBase: 42, online: false, ups: "sin" },
];

function serialFor(o: Oficina): string {
  const r = rng(Number(o.codigo) * 7919);
  let s = "";
  for (let i = 0; i < 7; i++) s += Math.floor(r() * 16).toString(16);
  return s;
}

export function sondaIdFor(o: Oficina): string {
  return `${o.nombre.toUpperCase()}-${o.codigo}-${serialFor(o)}`;
}

// Onda temporal suave (periodo ~40 min) para que los valores se muevan.
function wobble(seed: number, t: number, amp: number): number {
  return Math.sin(t / (1000 * 60 * 40) + seed) * amp;
}

function medicion(o: Oficina, t: number) {
  const seed = Number(o.codigo);
  const r = rng(seed + Math.floor(t / 300_000)); // varía por bucket de 5 min
  const eth = Math.max(5, o.ethBase + wobble(seed, t, o.ethBase * 0.12) + (r() - 0.5) * o.ethBase * 0.08);
  const wifi = Math.max(2, o.wifiBase + wobble(seed + 3, t, o.wifiBase * 0.15) + (r() - 0.5) * o.wifiBase * 0.1);
  const latEth = Math.round(8 + r() * 22 + (o.online ? 0 : 0));
  const latWifi = Math.round(latEth + 4 + r() * 18);
  return { eth: Math.round(eth * 10) / 10, wifi: Math.round(wifi * 10) / 10, latEth, latWifi, cpu: Math.round(12 + r() * 30), ram: Math.round(28 + r() * 35), temp: (46 + r() * 14).toFixed(1) };
}

function upsInfo(o: Oficina) {
  if (o.ups === "linea") return { status: "En línea", nivel: 100, conectada: true, modo: "LINEA" };
  if (o.ups === "bateria") return { status: "En batería", nivel: 35 + (Number(o.codigo) % 40), conectada: false, modo: "BATERIA" };
  return { status: "Sin comunicación", nivel: 0, conectada: false, modo: "LINEA" };
}

export async function demoDispositivos(): Promise<Dispositivo[]> {
  const now = Date.now();
  return OFICINAS.map((o) => {
    const m = medicion(o, now);
    const ups = upsInfo(o);
    const seed = Number(o.codigo);
    const ultimo = o.online
      ? now - (seed % 150) * 1000                       // hace 0–2.5 min
      : now - (3600_000 * (4 + (seed % 30)));           // hace horas/días
    const id = sondaIdFor(o);
    return {
      id,
      cpu_id: id,
      codigo_mined: o.codigo,
      id_hardware: id,
      version_sonda: "rapidnet-demo",
      online: o.online,
      ultimo_reporte: ts(ultimo),
      download_mbps: o.online ? Math.max(m.eth, m.wifi) : 0,
      eth_download_mbps: o.online ? m.eth : 0,
      wifi_download_mbps: o.online ? m.wifi : 0,
      latitud: o.lat,
      longitud: o.lng,
      gps_status: "FIX_3D",
      cpu_usage: o.online ? m.cpu : 0,
      ram_usage: o.online ? m.ram : 0,
      disk_usage: 0,
      temp_cpu: o.online ? m.temp : "N/A",
      eth_latencia_ms: o.online ? m.latEth : 0,
      wifi_latencia_ms: o.online ? m.latWifi : 0,
      web_check_mined: o.online ? "ACCESIBLE" : "SIN_CONEXION",
      web_check_streaming: o.online ? "ACCESIBLE" : "SIN_CONEXION",
      web_check_adultos: o.online ? (o.bypass ? "ACCESIBLE" : "BLOQUEADO") : "SIN_CONEXION",
      web_check_apuestas: o.online ? "BLOQUEADO" : "SIN_CONEXION",
      ups_status: o.online ? ups.status : "Sin comunicación",
      ups_nivel: o.online ? ups.nivel : 0,
      ups_conectada: o.online ? ups.conectada : false,
      ups_modo: ups.modo,
      link_rpi_connect: "",
      alerta_enviada: false,
      ticket_activo: !o.online,
    };
  });
}

export async function demoEscuelas(): Promise<Record<string, Escuela>> {
  const map: Record<string, Escuela> = {};
  for (const o of OFICINAS) {
    const id = sondaIdFor(o);
    map[id] = {
      id,
      nombre_escuela: o.nombre,
      contacto_principal: "", tel_principal: "", email_principal: "",
      contacto_secundario: "", tel_secundario: "", email_secundario: "",
      direccion: "",
      latitud_fija: o.lat,
      longitud_fija: o.lng,
      conectividad: "Dual-link",
      cod_ce: o.codigo,
    };
  }
  return map;
}

export async function demoCoordsEscuelas(): Promise<Record<string, { nombre: string; lat: number; lng: number }>> {
  const map: Record<string, { nombre: string; lat: number; lng: number }> = {};
  for (const o of OFICINAS) map[o.codigo] = { nombre: o.nombre, lat: o.lat, lng: o.lng };
  return map;
}

function registroAt(o: Oficina, t: number, i: number): RegistroHistorico {
  const m = medicion(o, t);
  const ups = upsInfo(o);
  return {
    id: `${o.codigo}-${i}`,
    cpu_id: sondaIdFor(o),
    download_mbps: Math.max(m.eth, m.wifi),
    eth_download_mbps: m.eth,
    wifi_download_mbps: m.wifi,
    latitud: o.lat,
    longitud: o.lng,
    online: true,
    web_check_mined: "ACCESIBLE",
    web_check_streaming: "ACCESIBLE",
    web_check_adultos: o.bypass ? "ACCESIBLE" : "BLOQUEADO",
    web_check_apuestas: "BLOQUEADO",
    ups_status: ups.status,
    ups_nivel: ups.nivel,
    cpu_usage: m.cpu,
    ram_usage: m.ram,
    timestamp: ts(t),
  };
}

export async function demoRegistrosRecientes(limite = 3000, horas = 12): Promise<RegistroHistorico[]> {
  const now = Date.now();
  const paso = 5 * 60 * 1000;
  const out: RegistroHistorico[] = [];
  const activos = OFICINAS.filter((o) => o.online);
  outer: for (let t = now; t >= now - horas * 3600_000; t -= paso) {
    for (const o of activos) {
      out.push(registroAt(o, t, out.length));
      if (out.length >= limite) break outer;
    }
  }
  return out;
}

export async function demoRegistrosDispositivo(cpuId: string, limite = 100): Promise<RegistroHistorico[]> {
  const o = OFICINAS.find((x) => sondaIdFor(x) === cpuId || x.codigo === cpuId);
  if (!o) return [];
  const now = Date.now();
  const paso = 5 * 60 * 1000;
  const out: RegistroHistorico[] = [];
  for (let i = 0; i < limite; i++) out.push(registroAt(o, now - i * paso, i));
  return out;
}

export async function demoVelocidadBuckets(
  horas = 12,
  sondaId?: string,
  bucketMin = 5,
  sondaIds?: string[],
): Promise<{ ts: number; descarga: number; subida: number }[]> {
  const ids = sondaIds?.filter(Boolean);
  if (sondaIds && !ids?.length) return [];
  let pool = OFICINAS.filter((o) => o.online);
  if (ids?.length) pool = pool.filter((o) => ids.includes(sondaIdFor(o)) || ids.includes(o.codigo));
  else if (sondaId) pool = pool.filter((o) => sondaIdFor(o) === sondaId || o.codigo === sondaId);
  if (!pool.length) return [];
  const now = Date.now();
  const paso = bucketMin * 60 * 1000;
  const out: { ts: number; descarga: number; subida: number }[] = [];
  for (let t = now - horas * 3600_000; t <= now; t += paso) {
    let eth = 0, wifi = 0;
    for (const o of pool) { const m = medicion(o, t); eth += m.eth; wifi += m.wifi; }
    out.push({ ts: t, descarga: Math.round((eth / pool.length) * 10) / 10, subida: Math.round((wifi / pool.length) * 10) / 10 });
  }
  return out;
}

export async function demoRegistrosPorRango(desde: Date, hasta: Date): Promise<RegistroHistorico[]> {
  const paso = 5 * 60 * 1000;
  const out: RegistroHistorico[] = [];
  const activos = OFICINAS.filter((o) => o.online);
  outer: for (let t = hasta.getTime(); t >= desde.getTime(); t -= paso) {
    for (const o of activos) {
      out.push(registroAt(o, t, out.length));
      if (out.length >= 10000) break outer;
    }
  }
  return out;
}
