import { getDispositivos, getEscuelas, getRegistrosRecientes } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SpeedChart } from "@/components/SpeedChart";
import { RangeSelector } from "@/components/RangeSelector";

export const revalidate = 60;

interface PageProps {
  searchParams: Promise<{ sonda?: string; horas?: string }>;
}

const RANGOS_VALIDOS = [1, 3, 5, 8, 12];

export default async function VelocidadPage({ searchParams }: PageProps) {
  const { sonda: sondaParam, horas: horasParam } = await searchParams;
  const horas = RANGOS_VALIDOS.includes(Number(horasParam)) ? Number(horasParam) : 12;

  const [dispositivos, escuelas, registros] = await Promise.all([
    getDispositivos(),
    getEscuelas(),
    getRegistrosRecientes(2000, horas),
  ]);

  // Build device list
  const deviceList = dispositivos.map((d) => {
    const cleanId = (d.cpu_id || d.id).replace(/"/g, "").trim();
    const esc = escuelas[cleanId] ?? escuelas[d.cpu_id] ?? escuelas[d.id];
    return {
      cpuId: cleanId,
      label: esc?.nombre_escuela || cleanId,
      online: d.online,
      download_mbps: d.download_mbps,
      eth_download_mbps: d.eth_download_mbps,
      wifi_download_mbps: d.wifi_download_mbps,
    };
  });

  // Filter by sonda param or show all
  const filteredDevices = sondaParam
    ? deviceList.filter((d) => d.cpuId === sondaParam)
    : deviceList;

  const filteredRegistros = sondaParam
    ? registros.filter((r) => r.cpu_id === sondaParam)
    : registros;

  const speedData = [...filteredRegistros].reverse().map((r) => {
    let hora = "";
    if (r.timestamp && typeof r.timestamp === "object" && "toDate" in r.timestamp) {
      const d = (r.timestamp as { toDate: () => Date }).toDate();
      hora = d.toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit", timeZone: "America/El_Salvador" });
    }
    return {
      hora,
      descarga: r.eth_download_mbps || r.download_mbps,
      subida: r.wifi_download_mbps,
    };
  });

  const conVelocidad = filteredRegistros.filter((r) => r.download_mbps > 0);
  const downs = conVelocidad.map((r) => r.download_mbps);
  const maxDown = downs.length ? Math.max(...downs).toFixed(1) : "—";
  const minDown = downs.length ? Math.min(...downs).toFixed(1) : "—";
  const avgDown = downs.length ? (downs.reduce((a, b) => a + b, 0) / downs.length).toFixed(1) : "—";

  // Per-device speed summary table
  const deviceSpeedMap = new Map<string, { total: number; sum: number; max: number; records: number }>();
  for (const r of registros) {
    const entry = deviceSpeedMap.get(r.cpu_id) ?? { total: 0, sum: 0, max: 0, records: 0 };
    entry.records++;
    if (r.download_mbps > 0) {
      entry.total++;
      entry.sum += r.download_mbps;
      if (r.download_mbps > entry.max) entry.max = r.download_mbps;
    }
    deviceSpeedMap.set(r.cpu_id, entry);
  }

  const titulo = sondaParam
    ? `Velocidad — ${filteredDevices[0]?.label || sondaParam}`
    : "Velocidad — Todas las Sondas";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Historial de Velocidad</h1>
        <p className="text-sm text-gray-500 mt-1">
          {sondaParam ? `Metricas de ${filteredDevices[0]?.label || sondaParam}` : "Metricas de descarga por dispositivo — usa el filtro del sidebar para ver una sonda especifica"}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Max. Descarga", value: `${maxDown} Mbps` },
          { label: "Min. Descarga", value: `${minDown} Mbps` },
          { label: "Prom. Descarga", value: `${avgDown} Mbps` },
        ].map(({ label, value }) => (
          <Card key={label} className="rounded-2xl shadow-sm">
            <CardContent className="pt-4">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-sm font-semibold text-gray-700">{titulo} ({horas}h)</CardTitle>
          <RangeSelector current={horas} />
        </CardHeader>
        <CardContent>
          {speedData.length > 0 ? (
            <SpeedChart data={speedData} />
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-gray-400">Sin mediciones de velocidad disponibles</p>
              <p className="text-xs text-gray-300 mt-1">
                {sondaParam ? "Este dispositivo no tiene registros de velocidad o reporta 0 Mbps" : "No hay registros con velocidad > 0"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-device speed summary (when viewing all) */}
      {!sondaParam && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Resumen por Dispositivo</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3">Escuela</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Ethernet Actual</th>
                    <th className="px-4 py-3">WiFi Actual</th>
                    <th className="px-4 py-3">Max. Historica</th>
                    <th className="px-4 py-3">Prom. Historica</th>
                    <th className="px-4 py-3">Registros</th>
                  </tr>
                </thead>
                <tbody>
                  {deviceList.map((d) => {
                    const stats = deviceSpeedMap.get(d.cpuId);
                    return (
                      <tr key={d.cpuId} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-gray-800">{d.label}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium ${d.online ? "text-green-700" : "text-red-600"}`}>
                            <span className={`w-2 h-2 rounded-full ${d.online ? "bg-green-500" : "bg-red-500"}`} />
                            {d.online ? "Online" : "Offline"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-medium">{d.eth_download_mbps > 0 ? `${d.eth_download_mbps.toFixed(1)} Mbps` : "—"}</td>
                        <td className="px-4 py-2.5 font-medium">{d.wifi_download_mbps > 0 ? `${d.wifi_download_mbps.toFixed(1)} Mbps` : "—"}</td>
                        <td className="px-4 py-2.5">{stats?.max ? `${stats.max.toFixed(1)} Mbps` : "—"}</td>
                        <td className="px-4 py-2.5">{stats?.total ? `${(stats.sum / stats.total).toFixed(1)} Mbps` : "—"}</td>
                        <td className="px-4 py-2.5 text-gray-500">{stats?.records ?? 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent measurements table */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">Ultimas Mediciones</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                  {!sondaParam && <th className="px-4 py-3">Dispositivo</th>}
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Ethernet (Mbps)</th>
                  <th className="px-4 py-3">WiFi (Mbps)</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegistros.slice(0, 20).map((r) => {
                  let fecha = "—";
                  const ts = r.timestamp;
                  if (ts && typeof ts === "object" && "toDate" in ts) {
                    fecha = (ts as { toDate: () => Date }).toDate().toLocaleString("es-SV", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "America/El_Salvador",
                    });
                  }
                  const dev = deviceList.find((d) => d.cpuId === r.cpu_id);
                  return (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      {!sondaParam && <td className="px-4 py-2.5 text-gray-600 text-xs">{dev?.label || r.cpu_id}</td>}
                      <td className="px-4 py-2.5 text-gray-600">{fecha}</td>
                      <td className="px-4 py-2.5 font-medium">{r.eth_download_mbps > 0 ? r.eth_download_mbps.toFixed(1) : "—"}</td>
                      <td className="px-4 py-2.5 font-medium">{r.wifi_download_mbps > 0 ? r.wifi_download_mbps.toFixed(1) : "—"}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 text-xs ${r.online ? "text-green-600" : "text-red-500"}`}>
                          <span className={`w-2 h-2 rounded-full ${r.online ? "bg-green-500" : "bg-red-500"}`} />
                          {r.online ? "Online" : "Offline"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredRegistros.length === 0 && (
                  <tr>
                    <td colSpan={sondaParam ? 4 : 5} className="px-4 py-8 text-center text-gray-400">Sin registros</td>
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
