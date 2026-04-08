import { getAlertas, getUltimosRegistros } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, ShieldOff, ShieldCheck } from "lucide-react";

export const revalidate = 60;

export default async function AlertasPage() {
  const [alertas, todos] = await Promise.all([getAlertas(50), getUltimosRegistros(100)]);

  // Estado del filtro de contenido por sonda (último registro de cada sonda)
  const porSonda: Record<string, { filtro: boolean; mined: boolean; serie: string; fecha: string }> = {};
  for (const r of todos) {
    if (!porSonda[r.serie]) {
      const filtroActivo = r.pings?.restringido === -1; // -1 indica que el sitio no responde (filtro activo)
      const minedAccesible = r.pings?.mined > 0;
      porSonda[r.serie] = {
        serie: r.serie,
        filtro: filtroActivo,
        mined: minedAccesible,
        fecha: r.fecha,
      };
    }
  }

  const sondas = Object.values(porSonda);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Alertas y Estado de Filtros</h1>
        <p className="text-sm text-gray-500 mt-1">Historial de fallas y verificación de filtros de contenido</p>
      </div>

      {/* Estado del filtro por sonda */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">Estado del Filtro de Contenido</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Sonda</th>
                  <th className="px-4 py-3">Filtro de contenido</th>
                  <th className="px-4 py-3">Sitio MINED</th>
                  <th className="px-4 py-3">Última verificación</th>
                </tr>
              </thead>
              <tbody>
                {sondas.map((s) => (
                  <tr key={s.serie} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{s.serie}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${s.filtro ? "text-green-700" : "text-red-600"}`}>
                        {s.filtro ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
                        {s.filtro ? "Activo" : "No detectado"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${s.mined ? "text-green-700" : "text-red-600"}`}>
                        {s.mined ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                        {s.mined ? "Accesible" : "No accesible"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{s.fecha}</td>
                  </tr>
                ))}
                {sondas.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">Sin datos</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Historial de alertas críticas */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Historial de Fallas ({alertas.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {alertas.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">Sin alertas registradas ✓</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3">Sonda</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Detalle</th>
                    <th className="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {alertas.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-gray-800">{r.serie}</td>
                      <td className="px-4 py-2.5 text-gray-600">{r.fecha}</td>
                      <td className="px-4 py-2.5 text-gray-600">{r.alertas_detalle?.join(", ") || "—"}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="destructive" className="rounded-full text-xs">FALLA</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
