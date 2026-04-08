import { getTicketsRecientes, getTicketStats } from "@/lib/tickets";
import { Card, CardContent } from "@/components/ui/card";
import { TicketCheck, AlertTriangle, ArrowUpCircle, CheckCircle2, Clock } from "lucide-react";
import { TicketFilter } from "@/components/TicketFilter";

export const revalidate = 60;

export default async function TicketsPage() {
  const [tickets, stats] = await Promise.all([
    getTicketsRecientes(200),
    getTicketStats(),
  ]);

  // Serialize timestamps to strings for client component
  const serializedTickets = tickets.map((t) => ({
    id: t.id,
    serie: t.serie,
    dispositivo: t.dispositivo,
    estado: t.estado,
    nivel: t.nivel,
    inicio_desconexion: t.inicio_desconexion?.toDate?.()
      ? t.inicio_desconexion.toDate().toISOString()
      : String(t.inicio_desconexion),
    actualizado: t.actualizado?.toDate?.()
      ? t.actualizado.toDate().toISOString()
      : String(t.actualizado),
    resolucion: t.resolucion?.toDate?.()
      ? t.resolucion.toDate().toISOString()
      : null,
    duracion_minutos: t.duracion_minutos,
    alertas_detalle: t.alertas_detalle,
    notificado: t.notificado,
    notas: t.notas,
  }));

  const kpis = [
    {
      label: "Tickets Abiertos",
      value: stats.abiertos,
      icon: AlertTriangle,
      color: stats.abiertos > 0 ? "#b91c1c" : "#1e3a5f",
    },
    {
      label: "Tickets Escalados",
      value: stats.escalados,
      icon: ArrowUpCircle,
      color: stats.escalados > 0 ? "#d97706" : "#1e3a5f",
    },
    {
      label: "Resueltos Hoy",
      value: stats.resueltosHoy,
      icon: CheckCircle2,
      color: "#16a34a",
    },
    {
      label: "MTTR Promedio",
      value: `${stats.mttrMinutos} min`,
      icon: Clock,
      color: "#2e6da4",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Tickets</h1>
        <p className="text-sm text-gray-500 mt-1">
          Seguimiento de incidencias de conectividad
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <Card
            key={label}
            className="rounded-2xl shadow-sm border bg-white"
            style={{ borderColor: "#e2e8f0" }}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-lg"
                style={{ backgroundColor: `${color}15` }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  {label}
                </p>
                <p className="text-xl font-bold" style={{ color }}>
                  {value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tickets table with client-side filtering */}
      <TicketFilter tickets={serializedTickets} />
    </div>
  );
}
