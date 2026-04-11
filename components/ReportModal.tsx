"use client";

import { useState } from "react";
import { X, FileDown, Check, CalendarDays } from "lucide-react";

const DEPARTAMENTOS = [
  "Ahuachapan", "Santa Ana", "Sonsonate", "Chalatenango", "La Libertad",
  "San Salvador", "Cuscatlan", "La Paz", "Cabanas", "San Vicente",
  "Usulutan", "San Miguel", "Morazan", "La Union",
];

type DatePreset = "today" | "7d" | "30d" | "this_month" | "last_month" | "custom";

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "7d", label: "Ultimos 7 dias" },
  { key: "30d", label: "Ultimos 30 dias" },
  { key: "this_month", label: "Este mes" },
  { key: "last_month", label: "Mes anterior" },
  { key: "custom", label: "Personalizado" },
];

function getPresetDates(preset: DatePreset): { desde: string; hasta: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const hasta = fmt(now);

  switch (preset) {
    case "today":
      return { desde: hasta, hasta };
    case "7d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return { desde: fmt(d), hasta };
    }
    case "30d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return { desde: fmt(d), hasta };
    }
    case "this_month":
      return { desde: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`, hasta };
    case "last_month": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { desde: fmt(first), hasta: fmt(last) };
    }
    default:
      return { desde: fmt(new Date(now.getTime() - 7 * 86400000)), hasta };
  }
}

interface Props {
  open: boolean;
  onClose: () => void;
  userZona?: string | null; // supervisor's locked zone
}

export function ReportModal({ open, onClose, userZona }: Props) {
  const [selectedZones, setSelectedZones] = useState<Set<string>>(
    userZona ? new Set([userZona]) : new Set()
  );
  const [preset, setPreset] = useState<DatePreset>("7d");
  const [customDesde, setCustomDesde] = useState("");
  const [customHasta, setCustomHasta] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const isLocked = !!userZona;

  function toggleZone(zone: string) {
    if (isLocked) return;
    setSelectedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zone)) next.delete(zone);
      else next.add(zone);
      return next;
    });
  }

  function selectAll() {
    if (isLocked) return;
    if (selectedZones.size === DEPARTAMENTOS.length) {
      setSelectedZones(new Set());
    } else {
      setSelectedZones(new Set(DEPARTAMENTOS));
    }
  }

  const { desde, hasta } = preset === "custom"
    ? { desde: customDesde, hasta: customHasta }
    : getPresetDates(preset);

  const canGenerate = selectedZones.size > 0 && desde && hasta;

  async function handleGenerate() {
    if (!canGenerate) return;
    setLoading(true);
    try {
      const zonasStr = Array.from(selectedZones).join(",");
      const url = `/api/reportes/zona?zonas=${encodeURIComponent(zonasStr)}&desde=${desde}&hasta=${hasta}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error desconocido" }));
        alert(err.error || "Error al generar reporte");
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `reporte-ECOS-${desde}-a-${hasta}.pdf`;
      a.click();
      URL.revokeObjectURL(blobUrl);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl shadow-2xl border overflow-hidden"
        style={{ backgroundColor: "#0f1d32", borderColor: "#1e3a5f" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#1e3a5f" }}>
          <div className="flex items-center gap-2">
            <FileDown className="w-5 h-5" style={{ color: "#93c5fd" }} />
            <h2 className="text-base font-bold" style={{ color: "#e2e8f0" }}>Generar Reporte PDF</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" style={{ color: "#94a3b8" }} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Date range */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <CalendarDays className="w-4 h-4" style={{ color: "#64748b" }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>
                Periodo
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPreset(p.key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={
                    preset === p.key
                      ? { backgroundColor: "#1e3a5f", color: "#93c5fd", border: "1px solid #2e6da4" }
                      : { backgroundColor: "#0a1628", color: "#94a3b8", border: "1px solid #1e3a5f" }
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
            {preset === "custom" && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs mb-1" style={{ color: "#64748b" }}>Desde</label>
                  <input
                    type="date"
                    value={customDesde}
                    onChange={(e) => setCustomDesde(e.target.value)}
                    className="w-full rounded-lg border px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    style={{ backgroundColor: "#0a1628", color: "#cbd5e1", borderColor: "#1e3a5f" }}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs mb-1" style={{ color: "#64748b" }}>Hasta</label>
                  <input
                    type="date"
                    value={customHasta}
                    onChange={(e) => setCustomHasta(e.target.value)}
                    className="w-full rounded-lg border px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    style={{ backgroundColor: "#0a1628", color: "#cbd5e1", borderColor: "#1e3a5f" }}
                  />
                </div>
              </div>
            )}
            {preset !== "custom" && desde && (
              <p className="text-xs mt-1" style={{ color: "#64748b" }}>
                {desde} al {hasta}
              </p>
            )}
          </div>

          {/* Zone selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>
                Departamentos ({selectedZones.size}/{DEPARTAMENTOS.length})
              </span>
              {!isLocked && (
                <button
                  onClick={selectAll}
                  className="text-xs font-medium hover:underline"
                  style={{ color: "#93c5fd" }}
                >
                  {selectedZones.size === DEPARTAMENTOS.length ? "Deseleccionar todo" : "Seleccionar todo"}
                </button>
              )}
            </div>
            {isLocked && (
              <p className="text-xs mb-2" style={{ color: "#d97706" }}>
                Supervisor: solo puede generar reportes de su zona asignada.
              </p>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              {DEPARTAMENTOS.map((zone) => {
                const selected = selectedZones.has(zone);
                const locked = isLocked && zone !== userZona;
                return (
                  <button
                    key={zone}
                    onClick={() => toggleZone(zone)}
                    disabled={locked}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all disabled:opacity-30"
                    style={
                      selected
                        ? { backgroundColor: "#1e3a5f", color: "#93c5fd", border: "1px solid #2e6da4" }
                        : { backgroundColor: "#0a162800", color: "#94a3b8", border: "1px solid #1e3a5f40" }
                    }
                  >
                    <div
                      className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                      style={
                        selected
                          ? { backgroundColor: "#2e6da4" }
                          : { backgroundColor: "#0a1628", border: "1px solid #1e3a5f" }
                      }
                    >
                      {selected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    {zone}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex items-center justify-between" style={{ borderColor: "#1e3a5f" }}>
          <p className="text-xs" style={{ color: "#475569" }}>
            {selectedZones.size > 0
              ? `${selectedZones.size} zona${selectedZones.size > 1 ? "s" : ""} seleccionada${selectedZones.size > 1 ? "s" : ""}`
              : "Seleccione al menos una zona"}
          </p>
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || loading}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-40"
            style={{ backgroundColor: "#1e3a5f" }}
          >
            <FileDown className="w-4 h-4" />
            {loading ? "Generando..." : "Descargar PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
