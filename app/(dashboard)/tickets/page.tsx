import { Card, CardContent } from "@/components/ui/card";
import { Tag } from "@carbon/icons-react";

export default function TicketsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestion de Casos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Seguimiento de incidencias reportadas
        </p>
      </div>

      <Card className="rounded-2xl shadow-sm border bg-white" style={{ borderColor: "#e2e8f0" }}>
        <CardContent className="flex flex-col items-center justify-center text-center gap-4 py-20">
          <div
            className="flex items-center justify-center w-16 h-16 rounded-2xl"
            style={{ backgroundColor: "#1e3a5f15" }}
          >
            <Tag size={32} style={{ color: "#1e3a5f" }} />
          </div>
          <div>
            <span
              className="inline-block rounded-full px-3 py-1 text-xs font-semibold text-white mb-3"
              style={{ backgroundColor: "#1e3a5f" }}
            >
              Proximamente
            </span>
            <h2 className="text-lg font-bold text-gray-900">Sistema de tickets en construccion</h2>
            <p className="text-sm text-gray-500 mt-1 max-w-md">
              La gestion de casos se integrara con el sistema de tickets de ECOS. Esta seccion estara
              disponible pronto.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
