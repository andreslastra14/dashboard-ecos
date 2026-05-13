import type { Dispositivo, RegistroHistorico } from "./firebase";
import { clasificarPorDepartamento } from "./geo";

export interface SlaResult {
  valor: number;
  unidad: "%" | "ms" | "h";
  target: number;
  targetOperator: ">=" | "<=";
  cumple: boolean;
  delta: number | null;
}

export interface DepartamentoStat {
  nombre: string;
  total: number;
  online: number;
  disponibilidad: number;
}

export interface SlaDashboard {
  disponibilidad: SlaResult;
  velocidadGiga: SlaResult;
  latenciaP95: SlaResult;
  cumplimientoIsp: SlaResult;
  mttr: SlaResult;
  upsHealth: SlaResult;
  cobertura: SlaResult;
  desgloseEstado: {
    normal: number;
    offline: number;
    total: number;
  };
  porDepartamento: DepartamentoStat[];
  fechaCorte: Date;
}

const GIGA_DOWNLOAD_MBPS = 20;
const ISP_CUMPLIMIENTO_FACTOR = 0.8;
const MTTR_GAP_MINUTOS = 10;
const COBERTURA_VENTANA_MS = 24 * 60 * 60 * 1000;

function quantile(arr: number[], q: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (base + 1 < sorted.length) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

function median(arr: number[]): number {
  return quantile(arr, 0.5);
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function makeResult(
  valor: number,
  unidad: "%" | "ms" | "h",
  target: number,
  operator: ">=" | "<=",
): SlaResult {
  const cumple = operator === ">=" ? valor >= target : valor <= target;
  return { valor, unidad, target, targetOperator: operator, cumple, delta: null };
}

function timestampMs(r: RegistroHistorico): number {
  const ts = r.timestamp;
  if (ts && typeof ts === "object" && "toDate" in ts) {
    return (ts as { toDate: () => Date }).toDate().getTime();
  }
  return 0;
}

function lastReportMs(d: Dispositivo): number {
  const ts = d.ultimo_reporte;
  if (ts && typeof ts === "object" && "toDate" in ts) {
    return (ts as { toDate: () => Date }).toDate().getTime();
  }
  return 0;
}

function calcularDisponibilidad(dispositivos: Dispositivo[]): SlaResult {
  const total = dispositivos.length;
  const online = dispositivos.filter((d) => d.online).length;
  const valor = total > 0 ? Math.round((online / total) * 1000) / 10 : 0;
  return makeResult(valor, "%", 99, ">=");
}

function calcularVelocidadGiga(
  dispositivos: Dispositivo[],
  registros: RegistroHistorico[],
): SlaResult {
  const porSonda = new Map<string, number[]>();
  for (const r of registros) {
    const dl = r.download_mbps;
    if (dl > 0) {
      if (!porSonda.has(r.cpu_id)) porSonda.set(r.cpu_id, []);
      porSonda.get(r.cpu_id)!.push(dl);
    }
  }
  const total = dispositivos.length;
  let compliant = 0;
  for (const arr of porSonda.values()) {
    if (median(arr) >= GIGA_DOWNLOAD_MBPS) compliant++;
  }
  const valor = total > 0 ? Math.round((compliant / total) * 1000) / 10 : 0;
  return makeResult(valor, "%", 85, ">=");
}

function calcularLatenciaP95(dispositivos: Dispositivo[]): SlaResult {
  const latencias: number[] = [];
  for (const d of dispositivos) {
    if (!d.online) continue;
    if (d.eth_latencia_ms > 0) latencias.push(d.eth_latencia_ms);
    if (d.wifi_latencia_ms > 0) latencias.push(d.wifi_latencia_ms);
  }
  const p95 = Math.round(quantile(latencias, 0.95));
  return makeResult(p95, "ms", 150, "<=");
}

function calcularCumplimientoIsp(
  registros: RegistroHistorico[],
  velocidadContratadaDefault: number,
): SlaResult {
  const minimoMbps = velocidadContratadaDefault * ISP_CUMPLIMIENTO_FACTOR;
  let total = 0;
  let cumple = 0;
  for (const r of registros) {
    if (r.download_mbps > 0) {
      total++;
      if (r.download_mbps >= minimoMbps) cumple++;
    }
  }
  const valor = total > 0 ? Math.round((cumple / total) * 1000) / 10 : 0;
  return makeResult(valor, "%", 95, ">=");
}

function calcularMttr(registros: RegistroHistorico[]): SlaResult {
  const porSonda = new Map<string, RegistroHistorico[]>();
  for (const r of registros) {
    if (!porSonda.has(r.cpu_id)) porSonda.set(r.cpu_id, []);
    porSonda.get(r.cpu_id)!.push(r);
  }
  const gapMs = MTTR_GAP_MINUTOS * 60 * 1000;
  const gapHoras: number[] = [];
  for (const lista of porSonda.values()) {
    const ordenada = lista
      .map((r) => timestampMs(r))
      .filter((t) => t > 0)
      .sort((a, b) => a - b);
    for (let i = 1; i < ordenada.length; i++) {
      const delta = ordenada[i] - ordenada[i - 1];
      if (delta >= gapMs) {
        gapHoras.push(delta / (60 * 60 * 1000));
      }
    }
  }
  const valor = Math.round(avg(gapHoras) * 10) / 10;
  return makeResult(valor, "h", 4, "<=");
}

function calcularUpsHealth(dispositivos: Dispositivo[]): SlaResult {
  const total = dispositivos.length;
  const ok = dispositivos.filter(
    (d) => d.ups_conectada === true || d.ups_status === "CON_LUZ",
  ).length;
  const valor = total > 0 ? Math.round((ok / total) * 1000) / 10 : 0;
  return makeResult(valor, "%", 90, ">=");
}

function calcularCobertura(dispositivos: Dispositivo[]): SlaResult {
  const ahora = Date.now();
  const total = dispositivos.length;
  const reciente = dispositivos.filter((d) => {
    const ts = lastReportMs(d);
    return ts > 0 && ahora - ts < COBERTURA_VENTANA_MS;
  }).length;
  const valor = total > 0 ? Math.round((reciente / total) * 1000) / 10 : 0;
  return makeResult(valor, "%", 98, ">=");
}

function calcularPorDepartamento(dispositivos: Dispositivo[]): DepartamentoStat[] {
  const stats = new Map<string, { total: number; online: number }>();
  for (const d of dispositivos) {
    const dept = clasificarPorDepartamento(d.latitud, d.longitud) ?? "Sin Clasificar";
    if (!stats.has(dept)) stats.set(dept, { total: 0, online: 0 });
    const s = stats.get(dept)!;
    s.total++;
    if (d.online) s.online++;
  }
  return [...stats.entries()]
    .map(([nombre, s]) => ({
      nombre,
      total: s.total,
      online: s.online,
      disponibilidad:
        s.total > 0 ? Math.round((s.online / s.total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function calcularSlas(
  dispositivos: Dispositivo[],
  registros: RegistroHistorico[],
  velocidadContratadaDefault = GIGA_DOWNLOAD_MBPS,
): SlaDashboard {
  const total = dispositivos.length;
  const online = dispositivos.filter((d) => d.online).length;
  return {
    disponibilidad: calcularDisponibilidad(dispositivos),
    velocidadGiga: calcularVelocidadGiga(dispositivos, registros),
    latenciaP95: calcularLatenciaP95(dispositivos),
    cumplimientoIsp: calcularCumplimientoIsp(registros, velocidadContratadaDefault),
    mttr: calcularMttr(registros),
    upsHealth: calcularUpsHealth(dispositivos),
    cobertura: calcularCobertura(dispositivos),
    desgloseEstado: {
      normal: online,
      offline: total - online,
      total,
    },
    porDepartamento: calcularPorDepartamento(dispositivos),
    fechaCorte: new Date(),
  };
}
