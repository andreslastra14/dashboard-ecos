"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Close, Checkmark, Add, Renew } from "@carbon/icons-react";

export interface SondaSearchDevice {
  id: string;
  nombre: string;
  online: boolean;
  codigo?: string;
  departamento?: string;
  zona?: string;
}

type FilterKey = "departamento" | "zona" | "estado";
type FilterState = Record<FilterKey, Set<string>>;

const EMPTY_FILTERS: FilterState = {
  departamento: new Set(),
  zona: new Set(),
  estado: new Set(),
};

const PARAM_KEYS = ["sonda", "sondas", "departamento", "zona", "estado"];
const MAX_RENDERED_RESULTS = 350;

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function splitParam(value: string | null): string[] {
  if (!value) return [];
  return value.split(",").map((v) => v.trim()).filter(Boolean);
}

function cloneFilters(filters: FilterState): FilterState {
  return {
    departamento: new Set(filters.departamento),
    zona: new Set(filters.zona),
    estado: new Set(filters.estado),
  };
}

function countBy(devices: SondaSearchDevice[], key: keyof SondaSearchDevice) {
  const counts = new Map<string, number>();
  for (const device of devices) {
    const value = String(device[key] || "Sin dato");
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0], "es"));
}

function selectedSummary(devices: SondaSearchDevice[], searchParams: { get: (name: string) => string | null }) {
  const ids = [...splitParam(searchParams.get("sonda")), ...splitParam(searchParams.get("sondas"))];
  const departamentos = splitParam(searchParams.get("departamento"));
  const zonas = splitParam(searchParams.get("zona"));
  const estados = splitParam(searchParams.get("estado"));
  const parts: string[] = [];
  if (ids.length === 1) {
    const device = devices.find((d) => d.id === ids[0]);
    parts.push(device?.nombre || ids[0]);
  } else if (ids.length > 1) {
    parts.push(`${ids.length} sondas`);
  }
  if (departamentos.length) parts.push(departamentos.join(", "));
  if (zonas.length) parts.push(zonas.join(", "));
  if (estados.length) parts.push(estados.map((e) => (e === "online" ? "Online" : "Offline")).join(", "));
  return parts.length ? parts.join(" · ") : "Buscar sondas, oficinas, código o departamento";
}

export function SondaSpotlightSearch({
  devices,
  sondaFija,
}: {
  devices: SondaSearchDevice[];
  sondaFija?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  const seedFromUrl = useCallback(() => {
    setQuery("");
    setSelected(new Set([...splitParam(searchParams.get("sonda")), ...splitParam(searchParams.get("sondas"))]));
    setFilters({
      departamento: new Set(splitParam(searchParams.get("departamento"))),
      zona: new Set(splitParam(searchParams.get("zona"))),
      estado: new Set(splitParam(searchParams.get("estado"))),
    });
  }, [searchParams]);

  const openSearch = useCallback(() => {
    if (sondaFija) return;
    seedFromUrl();
    setOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 40);
  }, [seedFromUrl, sondaFija]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openSearch]);

  const activeSummary = useMemo(
    () => selectedSummary(devices, searchParams),
    [devices, searchParams],
  );

  const filteredDevices = useMemo(() => {
    const term = normalize(query.trim());
    return devices.filter((device) => {
      if (filters.departamento.size && !filters.departamento.has(device.departamento || "Sin departamento")) return false;
      if (filters.zona.size && !filters.zona.has(device.zona || "Sin zona")) return false;
      if (filters.estado.size && !filters.estado.has(device.online ? "online" : "offline")) return false;
      if (!term) return true;
      const haystack = normalize([
        device.nombre,
        device.codigo ? `CE ${device.codigo}` : "",
        device.codigo || "",
        device.id,
        device.departamento || "",
        device.zona || "",
        device.online ? "online activo verde" : "offline inactivo rojo",
      ].join(" "));
      return term.split(/\s+/).every((part) => haystack.includes(part));
    });
  }, [devices, filters, query]);

  const renderedDevices = filteredDevices.slice(0, MAX_RENDERED_RESULTS);

  function toggleFilter(type: FilterKey, value: string) {
    setFilters((current) => {
      const next = cloneFilters(current);
      if (next[type].has(value)) next[type].delete(value);
      else next[type].add(value);
      return next;
    });
  }

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectVisible() {
    setSelected((current) => {
      const next = new Set(current);
      for (const device of filteredDevices) next.add(device.id);
      return next;
    });
  }

  function clearLocal() {
    setQuery("");
    setSelected(new Set());
    setFilters({
      departamento: new Set(),
      zona: new Set(),
      estado: new Set(),
    });
  }

  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of PARAM_KEYS) params.delete(key);

    const ids = Array.from(selected);
    const hasGroupFilters = filters.departamento.size > 0 || filters.zona.size > 0 || filters.estado.size > 0;
    if (ids.length === 1 && !hasGroupFilters) params.set("sonda", ids[0]);
    else if (ids.length > 0) params.set("sondas", ids.join(","));
    if (filters.departamento.size) params.set("departamento", Array.from(filters.departamento).join(","));
    if (filters.zona.size) params.set("zona", Array.from(filters.zona).join(","));
    if (filters.estado.size) params.set("estado", Array.from(filters.estado).join(","));

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    setOpen(false);
  }

  const selectedDevices = devices.filter((device) => selected.has(device.id));
  if (sondaFija) return null;

  return (
    <>
      <button
        type="button"
        onClick={openSearch}
        className="flex h-10 w-full min-w-0 items-center gap-2 rounded-lg border px-3 text-left text-sm transition-all hover:bg-white/10"
        style={{ backgroundColor: "#0f1d32", borderColor: "#0062a8", color: "#cbd5e1" }}
        title="Buscar sondas"
      >
        <Search size={16} className="shrink-0" style={{ color: "#94a3b8" }} />
        <span className="min-w-0 flex-1 truncate">{activeSummary}</span>
        <span className="hidden rounded border px-1.5 py-0.5 text-[10px] sm:inline" style={{ borderColor: "#334155", color: "#94a3b8" }}>
          ⌘K
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center bg-slate-950/45 px-3 py-16 backdrop-blur-sm" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <section className="grid max-h-[calc(100vh-6rem)] w-full max-w-5xl grid-rows-[auto_auto_1fr_auto] overflow-hidden rounded-xl border bg-white shadow-2xl" style={{ borderColor: "#dbe4ef" }}>
            <div className="flex h-16 items-center gap-3 border-b px-4" style={{ borderColor: "#e2e8f0" }}>
              <Search size={20} style={{ color: "#64748b" }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-full min-w-0 flex-1 bg-transparent text-lg font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="Nombre, CE, serial, departamento, zona, estado..."
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-md bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
                title="Cerrar"
              >
                <Close size={18} />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-slate-50 px-4 py-3" style={{ borderColor: "#e2e8f0" }}>
              <div className="flex min-w-0 flex-wrap gap-2">
                <button type="button" onClick={selectVisible} className="inline-flex h-8 items-center gap-1.5 rounded-full border bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-blue-50" style={{ borderColor: "#dbe4ef" }}>
                  <Add size={14} /> Seleccionar visibles
                </button>
                {[
                  ["estado", "online", "Online"],
                  ["estado", "offline", "Offline"],
                  ["zona", "Central", "Central"],
                  ["zona", "Occidente", "Occidente"],
                  ["zona", "Paracentral", "Paracentral"],
                  ["zona", "Oriente", "Oriente"],
                ].map(([type, value, label]) => {
                  const active = filters[type as FilterKey].has(value);
                  return (
                    <button
                      key={`${type}-${value}`}
                      type="button"
                      onClick={() => toggleFilter(type as FilterKey, value)}
                      className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold transition-colors ${active ? "bg-blue-50 text-blue-800" : "bg-white text-slate-600 hover:bg-slate-100"}`}
                      style={{ borderColor: active ? "#93c5fd" : "#dbe4ef" }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <span className="text-xs font-medium text-slate-500">{filteredDevices.length} resultados</span>
            </div>

            <div className="grid min-h-0 grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)]">
              <aside className="min-h-0 overflow-y-auto border-b bg-slate-50 p-3 md:border-b-0 md:border-r" style={{ borderColor: "#e2e8f0" }}>
                {([
                  ["departamento", "Departamento", countBy(devices, "departamento")],
                  ["zona", "Zona", countBy(devices, "zona")],
                  ["estado", "Estado", [["online", devices.filter((d) => d.online).length], ["offline", devices.filter((d) => !d.online).length]]],
                ] as Array<[FilterKey, string, Array<[string, number]>]>).map(([type, title, values]) => (
                  <div key={type} className="mb-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">{title}</p>
                    <div className="grid gap-1">
                      {values.map(([value, count]) => {
                        const active = filters[type].has(value);
                        const label = type === "estado" ? (value === "online" ? "Online" : "Offline") : value;
                        return (
                          <button
                            key={`${type}-${value}`}
                            type="button"
                            onClick={() => toggleFilter(type, value)}
                            className={`flex h-8 items-center justify-between gap-2 rounded-md px-2 text-left text-xs transition-colors ${active ? "bg-blue-100 text-blue-900" : "text-slate-600 hover:bg-slate-100"}`}
                          >
                            <span className="truncate">{label}</span>
                            <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-slate-500">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </aside>

              <div className="min-h-0 overflow-y-auto p-2">
                {renderedDevices.length > 0 ? (
                  <div className="grid gap-1">
                    {renderedDevices.map((device) => {
                      const isSelected = selected.has(device.id);
                      return (
                        <button
                          key={device.id}
                          type="button"
                          onClick={() => toggleSelected(device.id)}
                          className={`grid min-h-[68px] grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${isSelected ? "bg-blue-50" : "bg-white hover:bg-slate-50"}`}
                          style={{ borderColor: isSelected ? "#93c5fd" : "transparent" }}
                        >
                          <span className={`grid h-5 w-5 place-items-center rounded border text-white ${isSelected ? "bg-blue-600" : "bg-white"}`} style={{ borderColor: isSelected ? "#2563eb" : "#cbd5e1" }}>
                            {isSelected && <Checkmark size={14} />}
                          </span>
                          <span className="min-w-0">
                            <span className="mb-1 flex min-w-0 items-center gap-2">
                              <span className="truncate text-sm font-semibold text-slate-800">{device.nombre}</span>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${device.online ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                                {device.online ? "Online" : "Offline"}
                              </span>
                            </span>
                            <span className="flex flex-wrap gap-1.5 text-[11px] text-slate-500">
                              {device.codigo && <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">CE {device.codigo}</span>}
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">{device.id}</span>
                              <span>{device.departamento || "Sin departamento"}</span>
                              <span>{device.zona || "Sin zona"}</span>
                            </span>
                          </span>
                          <span className="hidden text-xs text-slate-400 sm:block">Seleccionar</span>
                        </button>
                      );
                    })}
                    {filteredDevices.length > renderedDevices.length && (
                      <div className="px-3 py-3 text-center text-xs text-slate-400">
                        Mostrando {renderedDevices.length} de {filteredDevices.length}; usa búsqueda o filtros para acotar.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12 text-center text-sm text-slate-400">Sin coincidencias con esos criterios.</div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: "#e2e8f0" }}>
              <div className="flex min-w-0 flex-wrap gap-1.5">
                {selectedDevices.length ? (
                  selectedDevices.slice(0, 8).map((device) => (
                    <button
                      key={device.id}
                      type="button"
                      onClick={() => toggleSelected(device.id)}
                      className="inline-flex max-w-[210px] items-center gap-1.5 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700"
                    >
                      <span className="truncate">{device.nombre}</span>
                      <Close size={12} />
                    </button>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">Sin selección específica: se aplican los filtros activos.</span>
                )}
                {selectedDevices.length > 8 && (
                  <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    +{selectedDevices.length - 8}
                  </span>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={clearLocal}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-300"
                >
                  <Renew size={14} /> Limpiar
                </button>
                <button
                  type="button"
                  onClick={applyFilters}
                  className="h-9 rounded-md px-4 text-xs font-bold text-white disabled:opacity-60"
                  style={{ backgroundColor: "#0062a8" }}
                >
                  Aplicar selección
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
