import { getUltimosPorSonda, getRegistrosSonda } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SpeedChart } from "@/components/SpeedChart";

export const revalidate = 60;

interface PageProps {
  searchParams: Promise<{ sonda?: string }>;
}

export default async function VelocidadPage({ searchParams }: PageProps) {
  const { sonda: serieParam } = await searchParams;

  const porSonda = await getUltimosPorSonda();
  const series = Object.keys(porSonda);
  const serieActiva = serieParam && series.includes(serieParam) ? serieParam : series[0] ?? null;

  const registros = serieActiva ? await getRegistrosSonda(serieActiva, 100) : [];
  const conVelocidad = registros.filter((r) => r.download_mbps > 0);

  const speedData = [...conVelocidad].reverse().map((r) => ({
    hora: r.fecha?.slice(11, 16) ?? "",
    descarga: r.download_mbps,
    subida: r.upload_mbps,
  }));

  const downs = conVelocidad.map((r) => r.download_mbps);
  const ups = conVelocidad.map((r) => r.upload_mbps);
  const maxDown = downs.length ? Math.max(...downs).toFixed(1) : "—";
  const minDown = downs.length ? Math.min(...downs).toFixed(1) : "—";
  const avgDown = downs.length ? (downs.reduce((a, b) => a + b, 0) / downs.length).toFixed(1) : "—";
  const avgUp = ups.length ? (ups.reduce((a, b) => a + b, 0) / ups.length).toFixed(1) : "—";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Historial de Velocidad</h1>
        <p className="text-sm text-gray-500 mt-1">Métricas de descarga y subida por sonda</p>
      </div>

      {/* Selector de sonda */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">Seleccionar Sonda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {series.map((s) => (
              <a
                key={s}
                href={`/velocidad?sonda=${encodeURIComponent(s)}`}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  s === serieActiva
                    ? "text-white border-transparent"
                    : "text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-700"
                }`}
                style={s === serieActiva ? { backgroundColor: "#1e3a5f" } : {}}
              >
                {s}
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      {serieActiva && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Máx. Descarga", value: `${maxDown} Mbps` },
            { label: "Mín. Descarga", value: `${minDown} Mbps` },
            { label: "Prom. Descarga", value: `${avgDown} Mbps` },
            { label: "Prom. Subida", value: `${avgUp} Mbps` },
          ].map(({ label, value }) => (
            <Card key={label} className="rounded-2xl shadow-sm">
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Gráfica */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Velocidad — {serieActiva ?? "Sin datos"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {speedData.length > 0 ? (
            <SpeedChart data={speedData} />
          ) : (
            <p className="text-sm text-gray-400 text-center py-12">Sin mediciones de velocidad disponibles</p>
          )}
        </CardContent>
      </Card>

      {/* Tabla de últimas mediciones */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">Últimas Mediciones</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Descarga (Mbps)</th>
                  <th className="px-4 py-3">Subida (Mbps)</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {conVelocidad.slice(0, 20).map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 text-gray-600">{r.fecha}</td>
                    <td className="px-4 py-2.5 font-medium">{r.download_mbps}</td>
                    <td className="px-4 py-2.5 font-medium">{r.upload_mbps}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${r.status === "OK" ? "bg-green-500" : "bg-red-500"}`} />
                      {r.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
