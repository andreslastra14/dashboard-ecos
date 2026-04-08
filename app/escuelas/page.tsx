import { getUltimosPorSonda } from "@/lib/queries";
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
  searchParams: Promise<{ zona?: string }>;
}) {
  const { zona } = await searchParams;
  const porSonda = await getUltimosPorSonda();

  const allSondas = Object.values(porSonda)
    .filter((r) => r.ubicacion?.lat && r.ubicacion?.lng)
    .map((r) => ({
      serie: r.serie,
      lat: r.ubicacion.lat,
      lng: r.ubicacion.lng,
      status: r.status,
      download_mbps: r.download_mbps,
      upload_mbps: r.upload_mbps,
      fecha: r.fecha,
      latencia_mined: r.pings?.mined ?? 0,
      departamento: clasificarPorDepartamento(r.ubicacion.lat, r.ubicacion.lng),
    }));

  // Compute stats per department
  const statsMap = new Map<string, { total: number; ok: number; falla: number }>();
  for (const s of allSondas) {
    if (!s.departamento) continue;
    const entry = statsMap.get(s.departamento) ?? { total: 0, ok: 0, falla: 0 };
    entry.total++;
    if (s.status === "OK") entry.ok++;
    if (s.status === "FALLA_RED") entry.falla++;
    statsMap.set(s.departamento, entry);
  }

  const zoneStats = DEPARTAMENTOS
    .filter((d) => statsMap.has(d.nombre))
    .map((d) => ({
      nombre: d.nombre,
      ...statsMap.get(d.nombre)!,
    }));

  // Filter sondas if zona is set
  const sondas = zona
    ? allSondas.filter((s) => s.departamento === zona)
    : allSondas;

  // Map center/zoom
  const dept = zona ? getDepartamento(zona) : undefined;
  const mapCenter: [number, number] | undefined = dept
    ? [dept.center.lat, dept.center.lng]
    : undefined;
  const mapZoom = dept ? 10 : undefined;

  const ok = sondas.filter((s) => s.status === "OK").length;
  const falla = sondas.filter((s) => s.status === "FALLA_RED").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mapa de Escuelas</h1>
          <p className="text-sm text-gray-500 mt-1">Ubicación y estado de cada sonda activa</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
            {ok} OK
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
            Latencia alta
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-600 inline-block" />
            {falla} Falla
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <Suspense fallback={null}>
          <ZoneFilter stats={zoneStats} />
        </Suspense>
        {zona && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white"
            style={{ backgroundColor: "#1e3a5f" }}
          >
            Mostrando: {zona} ({sondas.length} sondas)
          </span>
        )}
      </div>

      <Card className="rounded-2xl shadow-sm overflow-hidden">
        <CardContent className="p-0" style={{ height: "460px" }}>
          <SchoolMapWrapper sondas={sondas} center={mapCenter} zoom={mapZoom} />
        </CardContent>
      </Card>

      {/* Tabla de sondas */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">Detalle por Sonda</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Sonda</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Descarga</th>
                  <th className="px-4 py-3">Subida</th>
                  <th className="px-4 py-3">Lat. MINED</th>
                  <th className="px-4 py-3">Última lectura</th>
                </tr>
              </thead>
              <tbody>
                {sondas.map((s) => (
                  <tr key={s.serie} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{s.serie}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={s.status === "OK" ? "secondary" : "destructive"}
                        className="rounded-full text-xs"
                      >
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{s.download_mbps} Mbps</td>
                    <td className="px-4 py-3">{s.upload_mbps} Mbps</td>
                    <td className="px-4 py-3">{s.latencia_mined > 0 ? `${s.latencia_mined} ms` : "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{s.fecha}</td>
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
