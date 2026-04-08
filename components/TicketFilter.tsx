"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SerializedTicket = {
  id: string;
  serie: string;
  dispositivo: string;
  estado: "ABIERTO" | "ESCALADO" | "RESUELTO";
  nivel: "ALERTA_5MIN" | "ALERTA_10MIN";
  inicio_desconexion: string;
  actualizado: string;
  resolucion: string | null;
  duracion_minutos: number;
  alertas_detalle: string[];
  notificado: boolean;
  notas: string[];
};

const tabs = [
  { key: "TODOS", label: "Todos" },
  { key: "ABIERTO", label: "Abiertos" },
  { key: "ESCALADO", label: "Escalados" },
  { key: "RESUELTO", label: "Resueltos" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const estadoBadge: Record<string, { className: string; label: string }> = {
  ABIERTO: {
    className: "bg-red-100 text-red-700 border-red-200",
    label: "ABIERTO",
  },
  ESCALADO: {
    className: "bg-amber-100 text-amber-700 border-amber-200",
    label: "ESCALADO",
  },
  RESUELTO: {
    className: "bg-green-100 text-green-700 border-green-200",
    label: "RESUELTO",
  },
};

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
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

export function TicketFilter({ tickets }: { tickets: SerializedTicket[] }) {
  const [activeTab, setActiveTab] = useState<TabKey>("TODOS");

  const filtered =
    activeTab === "TODOS"
      ? tickets
      : tickets.filter((t) => t.estado === activeTab);

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-700">
          Tickets ({filtered.length})
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
            Sin tickets en esta categoría
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Sonda</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Nivel</th>
                  <th className="px-4 py-3">Inicio</th>
                  <th className="px-4 py-3">Duración</th>
                  <th className="px-4 py-3">Última actualización</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const badge = estadoBadge[t.estado];
                  return (
                    <tr
                      key={t.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-medium text-gray-800">
                        {t.serie}
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
                        {t.nivel === "ALERTA_5MIN" ? "5 min" : "10 min"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 text-xs">
                        {formatDate(t.inicio_desconexion)}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 text-xs">
                        {t.estado === "RESUELTO"
                          ? `${t.duracion_minutos} min`
                          : "En curso"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">
                        {formatDate(t.actualizado)}
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
