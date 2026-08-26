import type { Dispositivo, Escuela, RegistroHistorico } from "./firebase";
import { clasificarPorDepartamento } from "./geo";

export type DashboardFilterParams = {
  sonda?: string;
  sondas?: string;
  departamento?: string;
  zona?: string;
  estado?: string;
};

export type DeviceLookup = Record<string, Escuela | undefined>;

const ZONA_BY_DEPARTAMENTO: Record<string, string> = {
  "Ahuachapán": "Occidente",
  "Santa Ana": "Occidente",
  Sonsonate: "Occidente",
  Chalatenango: "Norte",
  "La Libertad": "Central",
  "San Salvador": "Central",
  Cuscatlán: "Paracentral",
  "La Paz": "Paracentral",
  Cabañas: "Paracentral",
  "San Vicente": "Paracentral",
  Usulután: "Oriente",
  "San Miguel": "Oriente",
  Morazán: "Oriente",
  "La Unión": "Oriente",
};

export function cleanDeviceId(d: Pick<Dispositivo, "cpu_id" | "id">): string {
  return (d.cpu_id || d.id).replace(/"/g, "").trim();
}

export function splitParam(value?: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => decodeURIComponent(v).trim())
    .filter(Boolean);
}

export function zonaFromDepartamento(departamento?: string | null): string {
  if (!departamento) return "Sin zona";
  return ZONA_BY_DEPARTAMENTO[departamento] ?? "Sin zona";
}

export function getEscuelaForDevice(d: Pick<Dispositivo, "cpu_id" | "id">, escuelas: DeviceLookup): Escuela | undefined {
  const cleanId = cleanDeviceId(d);
  return escuelas[cleanId] ?? escuelas[d.cpu_id] ?? escuelas[d.id];
}

export function getDepartamentoForDevice(d: Dispositivo, escuelas: DeviceLookup): string {
  const esc = getEscuelaForDevice(d, escuelas);
  const lat = Number(esc?.latitud_fija || d.latitud || 0);
  const lng = Number(esc?.longitud_fija || d.longitud || 0);
  return esc?.departamento || clasificarPorDepartamento(lat, lng) || "Sin departamento";
}

export function getZonaForDevice(d: Dispositivo, escuelas: DeviceLookup): string {
  return zonaFromDepartamento(getDepartamentoForDevice(d, escuelas));
}

export function hasDashboardFilters(filters: DashboardFilterParams): boolean {
  return Boolean(
    filters.sonda ||
      filters.sondas ||
      filters.departamento ||
      filters.zona ||
      filters.estado,
  );
}

export function matchesDashboardFilters(
  d: Dispositivo,
  escuelas: DeviceLookup,
  filters: DashboardFilterParams,
): boolean {
  const cleanId = cleanDeviceId(d);
  const ids = new Set([...splitParam(filters.sondas), ...splitParam(filters.sonda)]);
  if (ids.size && !ids.has(cleanId) && !ids.has(d.cpu_id) && !ids.has(d.id)) return false;

  const departamentos = splitParam(filters.departamento);
  if (departamentos.length && !departamentos.includes(getDepartamentoForDevice(d, escuelas))) return false;

  const zonas = splitParam(filters.zona);
  if (zonas.length && !zonas.includes(getZonaForDevice(d, escuelas))) return false;

  const estados = splitParam(filters.estado);
  if (estados.length) {
    const estado = d.online ? "online" : "offline";
    if (!estados.includes(estado)) return false;
  }

  return true;
}

export function filterDispositivos(
  dispositivos: Dispositivo[],
  escuelas: DeviceLookup,
  filters: DashboardFilterParams,
): Dispositivo[] {
  if (!hasDashboardFilters(filters)) return dispositivos;
  return dispositivos.filter((d) => matchesDashboardFilters(d, escuelas, filters));
}

export function selectedDeviceIdSet(dispositivos: Dispositivo[]): Set<string> {
  return new Set(dispositivos.map(cleanDeviceId));
}

export function filterRegistrosByDevices(
  registros: RegistroHistorico[],
  ids: Set<string>,
  active: boolean,
): RegistroHistorico[] {
  if (!active) return registros;
  return registros.filter((r) => ids.has(r.cpu_id));
}

export function filterTitle(filters: DashboardFilterParams): string {
  const parts: string[] = [];
  const sondaCount = splitParam(filters.sondas).length + splitParam(filters.sonda).length;
  if (sondaCount === 1) parts.push("1 sonda");
  if (sondaCount > 1) parts.push(`${sondaCount} sondas`);
  const departamentos = splitParam(filters.departamento);
  if (departamentos.length) parts.push(departamentos.join(", "));
  const zonas = splitParam(filters.zona);
  if (zonas.length) parts.push(zonas.join(", "));
  const estados = splitParam(filters.estado);
  if (estados.length) parts.push(estados.map((e) => (e === "online" ? "Online" : "Offline")).join(", "));
  return parts.join(" · ");
}
