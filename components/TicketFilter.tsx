"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SerializedCaso = {
  id: string;
  id_caso: string;
  Nombre_Escuela: string;
  cpu_id: string;
  motivo_reporte: string;
  estado: "Abierto" | "En Proceso" | "Cerrado";
  fecha_apertura: string;
  tipo_ticket: string;
  comentarios: string;
  ticket_operador: string;
  ultima_actualizacion: string;
  ubicacion: string;
};

const tabs = [
  { key: "TODOS", label: "Todos" },
  { key: "Abierto", label: "Abiertos" },
  { key: "En Proceso", label: "En Proceso" },
  { key: "Cerrado", label: "Cerrados" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const estadoBadge: Record<string, { className: string; label: string }> = {
  Abierto: {
    className: "bg-red-100 text-red-700 border-red-200",
    label: "Abierto",
  },
  "En Proceso": {
    className: "bg-amber-100 text-amber-700 border-amber-200",
    label: "En Proceso",
  },
  Cerrado: {
    className: "bg-green-100 text-green-700 border-green-200",
    label: "Cerrado",
  },
};

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString("es-SV", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function TicketFilter({ tickets }: { tickets: SerializedCaso[] }) {
  const [activeTab, setActiveTab] = useState<TabKey>("TODOS");

  const filtered =
    activeTab === "TODOS"
      ? tickets
      : tickets.filter((t) => t.estado === activeTab);

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700">
          Casos ({filtered.length})
        </CardTitle>
        <div className="flex gap-1 mt-2">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={
                activeTab === key
                  ? { backgroundColor: "#1e3a5f", color: "#fff" }
                  : { backgroundColor: "#f1f5f9", color: "#64748b" }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">
            Sin casos en esta categoria
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">ID Caso</th>
                  <th className="px-4 py-3">Escuela</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Operador</th>
                  <th className="px-4 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const badge = estadoBadge[t.estado] ?? {
                    className: "bg-gray-100 text-gray-700 border-gray-200",
                    label: t.estado,
                  };
                  return (
                    <tr
                      key={t.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-medium text-gray-800 font-mono text-xs">
                        {t.id_caso}
                      </td>
                      <td className="px-4 py-2.5 text-gray-800">
                        {t.Nombre_Escuela}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 text-xs">
                        {t.motivo_reporte}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          variant="outline"
                          className={`rounded-full text-xs ${badge.className}`}
                        >
                          {badge.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 text-xs">
                        {t.ticket_operador || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">
                        {formatDate(t.fecha_apertura)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
