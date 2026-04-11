import { getCasos, getCasoStats } from "@/lib/tickets";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { TicketFilter } from "@/components/TicketFilter";

export const revalidate = 60;

interface PageProps {
  searchParams: Promise<{ sonda?: string }>;
}

export default async function TicketsPage({ searchParams }: PageProps) {
  const { sonda: sondaParam } = await searchParams;
  const [allCasos, stats] = await Promise.all([
    getCasos(undefined, 200),
    getCasoStats(),
  ]);

  const casos = sondaParam
    ? allCasos.filter((c) => c.cpu_id === sondaParam)
    : allCasos;

  // Serialize Firestore Timestamps to ISO strings before passing to client
  const serializedCasos = casos.map((c) => ({
    id: c.id,
    id_caso: c.id_caso ?? "",
    Nombre_Escuela: c.Nombre_Escuela ?? "",
    cpu_id: c.cpu_id ?? "",
    motivo_reporte: c.motivo_reporte ?? "",
    estado: c.estado,
    fecha_apertura: c.fecha_apertura?.toDate?.()
      ? c.fecha_apertura.toDate().toISOString()
      : String(c.fecha_apertura ?? ""),
    tipo_ticket: c.tipo_ticket ?? "",
    comentarios: c.comentarios ?? "",
    ticket_operador: c.ticket_operador ?? "",
    ultima_actualizacion: c.ultima_actualizacion?.toDate?.()
      ? c.ultima_actualizacion.toDate().toISOString()
      : String(c.ultima_actualizacion ?? ""),
    ubicacion: c.ubicacion ?? "",
  }));

  const kpis = [
    {
      label: "Abiertos",
      value: stats.abiertos,
      icon: AlertTriangle,
      color: stats.abiertos > 0 ? "#b91c1c" : "#1e3a5f",
    },
    {
      label: "En Seguimiento",
      value: stats.enProceso,
      icon: Clock,
      color: stats.enProceso > 0 ? "#d97706" : "#1e3a5f",
    },
    {
      label: "Cerrados",
      value: stats.cerrados,
      icon: CheckCircle2,
      color: "#16a34a",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestion de Casos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Seguimiento de incidencias reportadas
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
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
      <TicketFilter tickets={serializedCasos} />
    </div>
  );
}
