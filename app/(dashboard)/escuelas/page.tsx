import { getDispositivos, getEscuelas } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SchoolMapWrapper } from "@/components/SchoolMapWrapper";
import { ZoneFilter } from "@/components/ZoneFilter";
import { clasificarPorDepartamento, getDepartamento, DEPARTAMENTOS } from "@/lib/geo";
import { Suspense } from "react";

export const revalidate = 60;

export default async function EscuelasPage({
  searchParams,
}: {
  searchParams: Promise<{ zona?: string; sonda?: string }>;
}) {
  const { zona, sonda: sondaParam } = await searchParams;
  const [allDispositivos, escuelas] = await Promise.all([
    getDispositivos(),
    getEscuelas(),
  ]);

  const dispositivos = sondaParam
    ? allDispositivos.filter((d) => {
        const cleanId = (d.cpu_id || d.id).replace(/"/g, "").trim();
        return cleanId === sondaParam || d.cpu_id === sondaParam;
      })
    : allDispositivos;

  // Demo coordinates for devices without GPS
  const DEMO_LOCATIONS = [
    { lat: 13.7013, lng: -89.2011 },
    { lat: 13.6773, lng: -89.2358 },
    { lat: 13.7942, lng: -88.8965 },
    { lat: 13.4833, lng: -88.1833 },
    { lat: 14.0333, lng: -89.5500 },
    { lat: 13.3500, lng: -87.8500 },
    { lat: 13.7167, lng: -89.7333 },
  ];

  // Merge device data with school info
  const allSondas = dispositivos.map((d, i) => {
    const cleanId = (d.cpu_id || d.id).replace(/"/g, "").trim();
    const escuela = escuelas[cleanId] ?? escuelas[d.id];
    const demo = DEMO_LOCATIONS[i % DEMO_LOCATIONS.length];
    const lat = escuela?.latitud_fija || d.latitud || demo.lat;
    const lng = escuela?.longitud_fija || d.longitud || demo.lng;
    return {
      serie: escuela?.nombre_escuela || cleanId,
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
      departamento: clasificarPorDepartamento(lat, lng),
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

  // Filter if zona is set
  const sondas = zona
    ? allSondas.filter((s) => s.departamento === zona)
    : allSondas;

  // Map center/zoom
  const dept = zona ? getDepartamento(zona) : undefined;
  const mapCenter: [number, number] | undefined = dept
    ? [dept.center.lat, dept.center.lng]
    : undefined;
  const mapZoom = dept ? 10 : undefined;

  // Stats por latencia (refleja los colores del marker en el mapa)
  const latBuckets = sondas.reduce(
    (acc, s) => {
      const lat = Math.max(s.eth_latencia_ms, s.wifi_latencia_ms);
      if (lat === 0) acc.sinMedicion++;
      else if (lat <= 200) acc.normal++;
      else acc.alta++;
      return acc;
    },
    { normal: 0, alta: 0, sinMedicion: 0 },
  );

  // Prepare map data for SchoolMapWrapper
  const mapMarkers = sondas.map((s) => ({
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
          <span className="flex items-center gap-1.5" title="Latencia entre 1 y 200 ms">
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
            {latBuckets.normal} Normal
          </span>
          <span className="flex items-center gap-1.5" title="Latencia mayor a 200 ms">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: "#f59e0b" }} />
            {latBuckets.alta} Alta latencia
          </span>
          <span className="flex items-center gap-1.5" title="Sondas apagadas o sin medición">
            <span className="w-3 h-3 rounded-full bg-red-600 inline-block" />
            {latBuckets.sinMedicion} Sin señal
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Suspense fallback={null}>
            <ZoneFilter stats={zoneStats} />
          </Suspense>
        </div>
        {zona && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white"
            style={{ backgroundColor: "#1e3a5f" }}
          >
            Mostrando: {zona} ({sondas.length} dispositivos)
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
                      <span className={`text-xs font-medium ${s.ups_status === "CONECTADA" ? "text-green-700" : "text-gray-500"}`}>
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
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Sin datos disponibles</td>
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
