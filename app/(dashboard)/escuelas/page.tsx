import { getDispositivos, getCoordsEscuelas } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SchoolMapWrapper } from "@/components/SchoolMapWrapper";
import { ZoneFilter } from "@/components/ZoneFilter";
import { clasificarPorDepartamento, getDepartamento, DEPARTAMENTOS } from "@/lib/geo";
import { cleanDeviceId, filterTitle, splitParam, zonaFromDepartamento, type DashboardFilterParams } from "@/lib/dashboard-filters";
import { Suspense } from "react";

export const revalidate = 30;
export const maxDuration = 60;

export default async function EscuelasPage({
  searchParams,
}: {
  searchParams: Promise<DashboardFilterParams>;
}) {
  const filters = await searchParams;
  const [allDispositivos, coordsEsc] = await Promise.all([
    getDispositivos(),
    getCoordsEscuelas(),
  ]);

  // Ubicación de cada sonda: 1) coords reales de la escuela por código MINED,
  // 2) GPS reportado por la sonda. Sin coordenadas "demo": si no hay ninguna,
  // lat/lng quedan null y la sonda no se pinta en el mapa (sí en la tabla).
  const allSondas = allDispositivos.map((d) => {
    const cleanId = cleanDeviceId(d);
    const codigo = (d.codigo_mined || "").trim();
    const esc = codigo ? coordsEsc[codigo] : undefined;
    const gpsLat = Number(d.latitud);
    const gpsLng = Number(d.longitud);
    const gpsOk = Number.isFinite(gpsLat) && Number.isFinite(gpsLng) && gpsLat !== 0 && gpsLng !== 0;
    const lat: number | null = esc?.lat ?? (gpsOk ? gpsLat : null);
    const lng: number | null = esc?.lng ?? (gpsOk ? gpsLng : null);
    return {
      serie: esc?.nombre || cleanId,
      cpuId: cleanId,
      lat,
      lng,
      online: d.online,
      download_mbps: d.download_mbps ?? 0,
      eth_download_mbps: d.eth_download_mbps ?? 0,
      wifi_download_mbps: d.wifi_download_mbps ?? 0,
      eth_latencia_ms: d.eth_latencia_ms ?? 0,
      wifi_latencia_ms: d.wifi_latencia_ms ?? 0,
      ups_status: d.ups_status ?? "—",
      ups_nivel: d.ups_nivel ?? 0,
      web_check_mined: d.web_check_mined ?? "—",
      departamento: lat != null && lng != null ? clasificarPorDepartamento(lat, lng) : null,
    };
  });

  // Compute stats per department
  const statsMap = new Map<string, { total: number; ok: number; falla: number }>();
  for (const s of allSondas) {
    if (!s.departamento) continue;
    const entry = statsMap.get(s.departamento) ?? { total: 0, ok: 0, falla: 0 };
    entry.total++;
    if (s.online) entry.ok++;
    else entry.falla++;
    statsMap.set(s.departamento, entry);
  }

  const zoneStats = DEPARTAMENTOS
    .filter((d) => statsMap.has(d.nombre))
    .map((d) => ({
      nombre: d.nombre,
      ...statsMap.get(d.nombre)!,
    }));

  const selectedIds = new Set([...splitParam(filters.sonda), ...splitParam(filters.sondas)]);
  const departamentos = splitParam(filters.departamento);
  const zonas = splitParam(filters.zona);
  const estados = splitParam(filters.estado);
  const sondas = allSondas.filter((s) => {
    if (selectedIds.size && !selectedIds.has(s.cpuId)) return false;
    if (departamentos.length && (!s.departamento || !departamentos.includes(s.departamento))) return false;
    if (zonas.length && !zonas.includes(zonaFromDepartamento(s.departamento))) return false;
    if (estados.length) {
      const estado = s.online ? "online" : "offline";
      if (!estados.includes(estado)) return false;
    }
    return true;
  });

  // Map center/zoom
  const dept = departamentos.length === 1 ? getDepartamento(departamentos[0]) : undefined;
  const mapCenter: [number, number] | undefined = dept
    ? [dept.center.lat, dept.center.lng]
    : undefined;
  const mapZoom = dept ? 10 : undefined;

  // Stats por estado (refleja los colores del marker en el mapa: verde=activa, rojo=inactiva)
  const estadoBuckets = sondas.reduce(
    (acc, s) => {
      if (s.online) acc.activas++;
      else acc.inactivas++;
      return acc;
    },
    { activas: 0, inactivas: 0 },
  );

  // Prepare map data for SchoolMapWrapper — solo las que tienen coordenadas reales.
  const mapMarkers = sondas
    .filter((s): s is typeof s & { lat: number; lng: number } => s.lat != null && s.lng != null)
    .map((s) => ({
    id: s.cpuId,
    nombre: s.serie,
    lat: s.lat,
    lng: s.lng,
    online: s.online,
    download_mbps: s.download_mbps,
    eth_download_mbps: s.eth_download_mbps,
    wifi_download_mbps: s.wifi_download_mbps,
    eth_latencia_ms: s.eth_latencia_ms,
    wifi_latencia_ms: s.wifi_latencia_ms,
    ups_status: s.ups_status,
    web_check_mined: s.web_check_mined,
    web_check_adultos: "",
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mapa de Escuelas</h1>
          <p className="text-sm text-gray-500 mt-1">Ubicacion y estado de cada dispositivo activo</p>
        </div>
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <span className="flex items-center gap-1.5" title="Reportó hace poco y con descarga > 0">
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
            {estadoBuckets.activas} Activas
          </span>
          <span className="flex items-center gap-1.5" title="Sin reporte reciente o descarga total ≤ 0">
            <span className="w-3 h-3 rounded-full bg-red-600 inline-block" />
            {estadoBuckets.inactivas} Inactivas
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Suspense fallback={null}>
            <ZoneFilter stats={zoneStats} />
          </Suspense>
        </div>
        {(selectedIds.size > 0 || departamentos.length > 0 || zonas.length > 0 || estados.length > 0) && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white"
            style={{ backgroundColor: "#1e3a5f" }}
          >
            Mostrando: {filterTitle(filters) || "selección"} ({sondas.length} dispositivos)
          </span>
        )}
      </div>

      <Card className="rounded-2xl shadow-sm overflow-hidden">
        <CardContent className="p-0" style={{ height: "460px" }}>
          <SchoolMapWrapper markers={mapMarkers} center={mapCenter} zoom={mapZoom} />
        </CardContent>
      </Card>

      {/* Tabla de dispositivos */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">Detalle por Dispositivo</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Escuela</th>
                  <th className="px-4 py-3">Serial</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Ethernet</th>
                  <th className="px-4 py-3">WiFi</th>
                  <th className="px-4 py-3">UPS</th>
                  <th className="px-4 py-3">Filtro</th>
                </tr>
              </thead>
              <tbody>
                {sondas.map((s) => (
                  <tr key={s.cpuId} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{s.serie}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs font-mono">{s.cpuId}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={s.online ? "secondary" : "destructive"}
                        className="rounded-full text-xs"
                      >
                        {s.online ? "Online" : "Offline"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{s.eth_download_mbps > 0 ? `${s.eth_download_mbps.toFixed(1)} Mbps` : "—"}</td>
                    <td className="px-4 py-3">{s.wifi_download_mbps > 0 ? `${s.wifi_download_mbps.toFixed(1)} Mbps` : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${s.ups_status === "En línea" ? "text-green-700" : "text-gray-500"}`}>
                        {s.ups_status} {s.ups_nivel > 0 ? `(${s.ups_nivel}%)` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${s.web_check_mined === "ACCESIBLE" ? "text-green-700" : "text-red-600"}`}>
                        {s.web_check_mined}
                      </span>
                    </td>
                  </tr>
                ))}
                {sondas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin datos disponibles</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
