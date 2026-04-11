import { getDispositivos, getEscuelas } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ShieldCheck,
  ShieldOff,
  CheckCircle,
  AlertTriangle,
  Battery,
  Cpu,
  HardDrive,
  Thermometer,
  MemoryStick,
} from "lucide-react";

export const revalidate = 60;

interface PageProps {
  searchParams: Promise<{ sonda?: string }>;
}

export default async function AlertasPage({ searchParams }: PageProps) {
  const { sonda: sondaParam } = await searchParams;
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

  // Merge device data with school names
  const devices = dispositivos.map((d) => {
    const cleanId = (d.cpu_id || d.id).replace(/"/g, "").trim();
    const escuela = escuelas[cleanId] ?? escuelas[d.cpu_id] ?? escuelas[d.id];
    return {
      cpuId: cleanId,
      nombre: escuela?.nombre_escuela || cleanId,
      online: d.online,
      web_check_mined: d.web_check_mined ?? "—",
      web_check_adultos: d.web_check_adultos ?? "—",
      web_check_apuestas: d.web_check_apuestas ?? "—",
      web_check_streaming: d.web_check_streaming ?? "—",
      ups_status: d.ups_status ?? "—",
      ups_nivel: d.ups_nivel ?? 0,
      ups_conectada: d.ups_conectada ?? false,
      cpu_usage: d.cpu_usage ?? 0,
      ram_usage: d.ram_usage ?? 0,
      disk_usage: d.disk_usage ?? 0,
      temp_cpu: d.temp_cpu ?? "—",
    };
  });

  const filtroOk = devices.filter(
    (d) => d.web_check_adultos === "BLOQUEADO" && d.web_check_apuestas === "BLOQUEADO"
  ).length;
  const filtroFail = devices.length - filtroOk;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Alertas y Estado del Sistema</h1>
        <p className="text-sm text-gray-500 mt-1">
          Filtros de contenido, UPS y salud de dispositivos
        </p>
      </div>

      {/* Summary KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="rounded-2xl shadow-sm border bg-white" style={{ borderColor: "#e2e8f0" }}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg" style={{ backgroundColor: "#16a34a15" }}>
              <ShieldCheck className="w-5 h-5" style={{ color: "#16a34a" }} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Filtro OK</p>
              <p className="text-xl font-bold" style={{ color: "#16a34a" }}>{filtroOk}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm border bg-white" style={{ borderColor: "#e2e8f0" }}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg" style={{ backgroundColor: "#b91c1c15" }}>
              <ShieldOff className="w-5 h-5" style={{ color: "#b91c1c" }} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Filtro Falla</p>
              <p className="text-xl font-bold" style={{ color: devices.length > 0 && filtroFail > 0 ? "#b91c1c" : "#1e3a5f" }}>{filtroFail}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm border bg-white" style={{ borderColor: "#e2e8f0" }}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg" style={{ backgroundColor: "#2e6da415" }}>
              <Battery className="w-5 h-5" style={{ color: "#2e6da4" }} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">UPS Conectadas</p>
              <p className="text-xl font-bold" style={{ color: "#2e6da4" }}>{devices.filter((d) => d.ups_conectada).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-sm border bg-white" style={{ borderColor: "#e2e8f0" }}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg" style={{ backgroundColor: "#1e3a5f15" }}>
              <Cpu className="w-5 h-5" style={{ color: "#1e3a5f" }} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Dispositivos</p>
              <p className="text-xl font-bold" style={{ color: "#1e3a5f" }}>{devices.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Filter Table */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">Estado del Filtro de Contenido</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Escuela</th>
                  <th className="px-4 py-3">MINED</th>
                  <th className="px-4 py-3">Adultos</th>
                  <th className="px-4 py-3">Apuestas</th>
                  <th className="px-4 py-3">Streaming</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={`filter-${d.cpuId}`} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{d.nombre}</td>
                    <td className="px-4 py-3">
                      <WebCheckBadge value={d.web_check_mined} expectBlocked={false} />
                    </td>
                    <td className="px-4 py-3">
                      <WebCheckBadge value={d.web_check_adultos} expectBlocked={true} />
                    </td>
                    <td className="px-4 py-3">
                      <WebCheckBadge value={d.web_check_apuestas} expectBlocked={true} />
                    </td>
                    <td className="px-4 py-3">
                      <WebCheckBadge value={d.web_check_streaming} expectBlocked={true} />
                    </td>
                  </tr>
                ))}
                {devices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin datos</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* UPS Status Table */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">Estado de UPS</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Escuela</th>
                  <th className="px-4 py-3">Estado UPS</th>
                  <th className="px-4 py-3">Nivel</th>
                  <th className="px-4 py-3">Conectada</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={`ups-${d.cpuId}`} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{d.nombre}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{d.ups_status}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${d.ups_nivel >= 50 ? "text-green-700" : d.ups_nivel >= 20 ? "text-amber-600" : "text-red-600"}`}>
                        {d.ups_nivel > 0 ? `${d.ups_nivel}%` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${d.ups_conectada ? "text-green-700" : "text-gray-500"}`}>
                        {d.ups_conectada ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                        {d.ups_conectada ? "Si" : "No"}
                      </span>
                    </td>
                  </tr>
                ))}
                {devices.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">Sin datos</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* System Health Table */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">Salud del Sistema</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Escuela</th>
                  <th className="px-4 py-3">
                    <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5" /> CPU</span>
                  </th>
                  <th className="px-4 py-3">
                    <span className="flex items-center gap-1"><MemoryStick className="w-3.5 h-3.5" /> RAM</span>
                  </th>
                  <th className="px-4 py-3">
                    <span className="flex items-center gap-1"><HardDrive className="w-3.5 h-3.5" /> Disco</span>
                  </th>
                  <th className="px-4 py-3">
                    <span className="flex items-center gap-1"><Thermometer className="w-3.5 h-3.5" /> Temp.</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={`health-${d.cpuId}`} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{d.nombre}</td>
                    <td className="px-4 py-3">
                      <UsageBar value={d.cpu_usage} />
                    </td>
                    <td className="px-4 py-3">
                      <UsageBar value={d.ram_usage} />
                    </td>
                    <td className="px-4 py-3">
                      <UsageBar value={d.disk_usage} />
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{d.temp_cpu}</td>
                  </tr>
                ))}
                {devices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin datos</td>
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

/* Helper: web check badge */
function WebCheckBadge({ value, expectBlocked }: { value: string; expectBlocked: boolean }) {
  // For MINED: we expect ACCESIBLE (green). For adult/gambling/streaming: we expect BLOQUEADO (green).
  const isGood = expectBlocked
    ? value === "BLOQUEADO"
    : value === "ACCESIBLE";

  const Icon = isGood ? ShieldCheck : ShieldOff;

  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${isGood ? "text-green-700" : "text-red-600"}`}>
      <Icon className="w-3.5 h-3.5" />
      {value}
    </span>
  );
}

/* Helper: usage progress bar */
function UsageBar({ value }: { value: number }) {
  const pct = Math.min(Math.max(value, 0), 100);
  const color = pct >= 90 ? "#b91c1c" : pct >= 70 ? "#d97706" : "#16a34a";

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-medium text-gray-600">{pct.toFixed(0)}%</span>
    </div>
  );
}
