"use client";

import { useState, useEffect, useMemo } from "react";
import { Close as X, DocumentDownload as FileDown, Checkmark as Check, Calendar as CalendarDays, Map, Screen as Monitor, Search } from "@carbon/icons-react";

const DEPARTAMENTOS = [
  "Ahuachapan", "Santa Ana", "Sonsonate", "Chalatenango", "La Libertad",
  "San Salvador", "Cuscatlan", "La Paz", "Cabanas", "San Vicente",
  "Usulutan", "San Miguel", "Morazan", "La Union",
];

type DatePreset = "today" | "7d" | "30d" | "this_month" | "last_month" | "custom";
type SelectMode = "zona" | "sonda";

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "this_month", label: "Este mes" },
  { key: "last_month", label: "Mes anterior" },
  { key: "custom", label: "Personalizado" },
];

interface DeviceOption {
  id: string;
  nombre: string;
}

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
  userZona?: string | null;
}

export function ReportModal({ open, onClose, userZona }: Props) {
  const [mode, setMode] = useState<SelectMode>("zona");
  const [selectedZones, setSelectedZones] = useState<Set<string>>(
    userZona ? new Set([userZona]) : new Set()
  );
  const [selectedSondas, setSelectedSondas] = useState<Set<string>>(new Set());
  const [preset, setPreset] = useState<DatePreset>("7d");
  const [customDesde, setCustomDesde] = useState("");
  const [customHasta, setCustomHasta] = useState("");
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (open && devices.length === 0) {
      fetch("/api/dispositivos/lista")
        .then((r) => r.json())
        .then((d) => setDevices(d))
        .catch(() => setDevices([]));
    }
  }, [open, devices.length]);

  const filteredDevices = useMemo(() => {
    if (!searchTerm) return devices;
    const term = searchTerm.toLowerCase();
    return devices.filter(
      (d) => d.nombre.toLowerCase().includes(term) || d.id.toLowerCase().includes(term)
    );
  }, [devices, searchTerm]);

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

  function selectAllZones() {
    if (isLocked) return;
    if (selectedZones.size === DEPARTAMENTOS.length) {
      setSelectedZones(new Set());
    } else {
      setSelectedZones(new Set(DEPARTAMENTOS));
    }
  }

  function toggleSonda(id: string) {
    setSelectedSondas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllSondas() {
    if (selectedSondas.size === devices.length) {
      setSelectedSondas(new Set());
    } else {
      setSelectedSondas(new Set(devices.map((d) => d.id)));
    }
  }

  const { desde, hasta } = preset === "custom"
    ? { desde: customDesde, hasta: customHasta }
    : getPresetDates(preset);

  const hasSelection = mode === "zona" ? selectedZones.size > 0 : selectedSondas.size > 0;
  const canGenerate = hasSelection && desde && hasta;

  async function handleGenerate() {
    if (!canGenerate) return;
    setLoading(true);
    try {
      let url: string;
      if (mode === "zona") {
        const zonasStr = Array.from(selectedZones).join(",");
        url = `/api/reportes/zona?zonas=${encodeURIComponent(zonasStr)}&desde=${desde}&hasta=${hasta}`;
      } else {
        const sondasStr = Array.from(selectedSondas).join(",");
        url = `/api/reportes/zona?sondas=${encodeURIComponent(sondasStr)}&desde=${desde}&hasta=${hasta}`;
      }
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
      a.download = `reporte-RapidNet-${desde}-a-${hasta}.pdf`;
      a.click();
      URL.revokeObjectURL(blobUrl);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  const selectionLabel = mode === "zona"
    ? selectedZones.size > 0
      ? `${selectedZones.size} zona${selectedZones.size > 1 ? "s" : ""}`
      : "Seleccione zona(s)"
    : selectedSondas.size > 0
      ? `${selectedSondas.size} sonda${selectedSondas.size > 1 ? "s" : ""}`
      : "Seleccione sonda(s)";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl shadow-2xl border overflow-hidden"
        style={{ backgroundColor: "#0f1d32", borderColor: "#0062a8" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#0062a8" }}>
          <div className="flex items-center gap-2">
            <FileDown size={20} style={{ color: "#93c5fd" }} />
            <h2 className="text-base font-bold" style={{ color: "#e2e8f0" }}>Generar Reporte PDF</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-white/10 transition-colors">
            <X size={20} style={{ color: "#94a3b8" }} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Date range */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <CalendarDays size={16} style={{ color: "#64748b" }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>
                Periodo
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPreset(p.key)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={
                    preset === p.key
                      ? { backgroundColor: "#0062a8", color: "#93c5fd", border: "1px solid #0a78c8" }
                      : { backgroundColor: "#04263e", color: "#94a3b8", border: "1px solid #0062a8" }
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
                    style={{ backgroundColor: "#04263e", color: "#cbd5e1", borderColor: "#0062a8" }}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs mb-1" style={{ color: "#64748b" }}>Hasta</label>
                  <input
                    type="date"
                    value={customHasta}
                    onChange={(e) => setCustomHasta(e.target.value)}
                    className="w-full rounded-lg border px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    style={{ backgroundColor: "#04263e", color: "#cbd5e1", borderColor: "#0062a8" }}
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

          {/* Mode toggle: Zona / Sonda */}
          <div>
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "#0062a8" }}>
              <button
                onClick={() => setMode("zona")}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold transition-all"
                style={
                  mode === "zona"
                    ? { backgroundColor: "#0062a8", color: "#93c5fd" }
                    : { backgroundColor: "#04263e", color: "#64748b" }
                }
              >
                <Map size={14} />
                Por Zona
              </button>
              <button
                onClick={() => setMode("sonda")}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold transition-all"
                style={
                  mode === "sonda"
                    ? { backgroundColor: "#0062a8", color: "#93c5fd" }
                    : { backgroundColor: "#04263e", color: "#64748b" }
                }
              >
                <Monitor size={14} />
                Por Sonda
              </button>
            </div>
          </div>

          {/* Zone selection */}
          {mode === "zona" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>
                  Departamentos ({selectedZones.size}/{DEPARTAMENTOS.length})
                </span>
                {!isLocked && (
                  <button
                    onClick={selectAllZones}
                    className="text-xs font-medium hover:underline"
                    style={{ color: "#93c5fd" }}
                  >
                    {selectedZones.size === DEPARTAMENTOS.length ? "Deseleccionar" : "Seleccionar todo"}
                  </button>
                )}
              </div>
              {isLocked && (
                <p className="text-xs mb-2" style={{ color: "#d97706" }}>
                  Supervisor: solo su zona asignada.
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
                          ? { backgroundColor: "#0062a8", color: "#93c5fd", border: "1px solid #0a78c8" }
                          : { backgroundColor: "#04263e00", color: "#94a3b8", border: "1px solid #0062a840" }
                      }
                    >
                      <div
                        className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                        style={
                          selected
                            ? { backgroundColor: "#0a78c8" }
                            : { backgroundColor: "#04263e", border: "1px solid #0062a8" }
                        }
                      >
                        {selected && <Check size={12} className="text-white" />}
                      </div>
                      {zone}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sonda selection */}
          {mode === "sonda" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>
                  Sondas ({selectedSondas.size}/{devices.length})
                </span>
                <button
                  onClick={selectAllSondas}
                  className="text-xs font-medium hover:underline"
                  style={{ color: "#93c5fd" }}
                >
                  {selectedSondas.size === devices.length ? "Deseleccionar" : "Seleccionar todo"}
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#64748b" }} />
                <input
                  type="text"
                  placeholder="Buscar oficina o serial..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  style={{ backgroundColor: "#04263e", color: "#cbd5e1", borderColor: "#0062a8" }}
                />
              </div>

              <div className="space-y-1 max-h-48 overflow-y-auto">
                {filteredDevices.map((d) => {
                  const selected = selectedSondas.has(d.id);
                  return (
                    <button
                      key={d.id}
                      onClick={() => toggleSonda(d.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all"
                      style={
                        selected
                          ? { backgroundColor: "#0062a8", color: "#93c5fd", border: "1px solid #0a78c8" }
                          : { backgroundColor: "#04263e00", color: "#94a3b8", border: "1px solid #0062a840" }
                      }
                    >
                      <div
                        className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                        style={
                          selected
                            ? { backgroundColor: "#0a78c8" }
                            : { backgroundColor: "#04263e", border: "1px solid #0062a8" }
                        }
                      >
                        {selected && <Check size={12} className="text-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{d.nombre}</p>
                        <p className="text-[10px] font-mono opacity-60">{d.id}</p>
                      </div>
                    </button>
                  );
                })}
                {filteredDevices.length === 0 && (
                  <p className="text-xs text-center py-4" style={{ color: "#64748b" }}>
                    {devices.length === 0 ? "Cargando sondas..." : "Sin resultados"}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex items-center justify-between" style={{ borderColor: "#0062a8" }}>
          <p className="text-xs" style={{ color: "#475569" }}>
            {selectionLabel}
          </p>
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || loading}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-40"
            style={{ backgroundColor: "#0062a8" }}
          >
            <FileDown size={16} />
            {loading ? "Generando..." : "Descargar PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
