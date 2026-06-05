"use client";

import Link from "next/link";
import { useState, useMemo, useRef, useEffect } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { LayoutDashboard, Globe, Map, Zap, AlertTriangle, TicketCheck, Monitor, X, Users, Search, ChevronDown, type LucideIcon } from "lucide-react";
import type { Role } from "@/lib/roles";

type NavItem = { href: string; label: string; icon: LucideIcon; disabled?: boolean };

const baseNav: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vista-global", label: "Vista Global", icon: Globe },
  { href: "/escuelas", label: "Mapa", icon: Map },
  { href: "/velocidad", label: "Velocidad", icon: Zap },
  { href: "/alertas", label: "Alertas", icon: AlertTriangle },
  // Tickets deshabilitado (Coming soon) hasta integrar el sistema de Salvatore
  { href: "/tickets", label: "Tickets", icon: TicketCheck, disabled: true },
];

interface DeviceOption {
  id: string;
  nombre: string;
  online: boolean;
  codigo?: string;
}

// Máximo de resultados renderizados a la vez (optimización para miles de sondas:
// nunca pintamos toda la lista en el DOM, solo los primeros que coinciden).
const MAX_VISIBLE = 50;

function DesktopSondaFilter({
  devices,
  selectedSonda,
  onSelect,
}: {
  devices: DeviceOption[];
  selectedSonda: string | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const term = search.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!term) return devices;
    return devices.filter(
      (d) =>
        d.nombre.toLowerCase().includes(term) ||
        (d.codigo ?? "").toLowerCase().includes(term) ||
        d.id.toLowerCase().includes(term),
    );
  }, [devices, term]);

  const visibles = matches.slice(0, MAX_VISIBLE);
  const restantes = matches.length - visibles.length;
  const selectedDevice = devices.find((d) => d.id === selectedSonda);

  function pick(id: string) {
    onSelect(id);
    setOpen(false);
    setSearch("");
  }

  return (
    <div className="mx-3 mt-4 pt-3 border-t" style={{ borderColor: "#1e3a5f" }} ref={ref}>
      <div className="flex items-center gap-1.5 mb-2">
        <Monitor className="w-3.5 h-3.5" style={{ color: "#64748b" }} />
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>
          Filtrar Sonda
        </span>
      </div>

      {/* Disparador */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 rounded-md border text-xs px-2 py-1.5 transition-colors"
        style={{ backgroundColor: "#0f1d32", color: selectedDevice ? "#cbd5e1" : "#64748b", borderColor: "#1e3a5f" }}
      >
        <span className="truncate text-left">{selectedDevice?.nombre || "Todas las sondas"}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: "#64748b" }} />
      </button>

      {open && (
        <div
          className="mt-1 rounded-md border overflow-hidden"
          style={{ backgroundColor: "#0f1d32", borderColor: "#1e3a5f" }}
        >
          {/* Buscador */}
          <div className="p-1.5 border-b" style={{ borderColor: "#1e3a5f" }}>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: "#64748b" }} />
              <input
                type="text"
                autoFocus
                placeholder="Buscar nombre o código…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded border pl-7 pr-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                style={{ backgroundColor: "#0a1628", color: "#cbd5e1", borderColor: "#1e3a5f" }}
              />
            </div>
          </div>

          {/* Lista */}
          <div className="max-h-60 overflow-y-auto py-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-600" style={{ scrollbarWidth: "thin", scrollbarColor: "#475569 transparent" }}>
            <button
              type="button"
              onClick={() => pick("")}
              className="w-full text-left px-2.5 py-1.5 text-xs transition-colors hover:bg-white/5"
              style={!selectedSonda ? { color: "#93c5fd" } : { color: "#94a3b8" }}
            >
              Todas las sondas
            </button>
            {visibles.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => pick(d.id)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs transition-colors hover:bg-white/5"
                style={selectedSonda === d.id ? { backgroundColor: "#1e3a5f", color: "#93c5fd" } : { color: "#cbd5e1" }}
              >
                <span className="min-w-0 text-left">
                  <span className="block truncate">{d.nombre}</span>
                  {d.codigo ? <span className="block text-[10px] font-mono opacity-50">CE {d.codigo}</span> : null}
                </span>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: d.online ? "#4ade80" : "#ef4444" }}
                />
              </button>
            ))}
            {matches.length === 0 && (
              <p className="px-2.5 py-2 text-[11px] text-center" style={{ color: "#64748b" }}>
                Sin coincidencias
              </p>
            )}
            {restantes > 0 && (
              <p className="px-2.5 py-1.5 text-[10px]" style={{ color: "#64748b" }}>
                y {restantes} más… afina la búsqueda
              </p>
            )}
          </div>
        </div>
      )}

      {selectedSonda && !open && (
        <button
          onClick={() => onSelect("")}
          className="flex items-center gap-1 mt-1.5 text-[10px] hover:underline"
          style={{ color: "#93c5fd" }}
        >
          <X className="w-3 h-3" /> Limpiar filtro
        </button>
      )}
    </div>
  );
}

export function Sidebar({ devices = [], userRole, sondaFija }: { devices?: DeviceOption[]; userRole?: Role; sondaFija?: string | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedSonda = sondaFija || searchParams.get("sonda");

  const nav: NavItem[] = userRole === "admin"
    ? [...baseNav, { href: "/admin", label: "Admin", icon: Users }]
    : baseNav;

  function navHref(href: string) {
    const sonda = sondaFija || selectedSonda;
    if (!sonda) return href;
    const params = new URLSearchParams();
    params.set("sonda", sonda);
    // Preserve zona param for escuelas page
    const zona = searchParams.get("zona");
    if (zona && href === "/escuelas") params.set("zona", zona);
    return `${href}?${params.toString()}`;
  }

  function handleFilterChange(val: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (val) params.set("sonda", val);
    else params.delete("sonda");
    const qs = params.toString();
    // push ya re-renderiza el Server Component con los nuevos searchParams.
    // (sin router.refresh() extra que duplicaba la consulta y hacía lento el filtro)
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <>
      {/* Sidebar — desktop */}
      <aside
        className="hidden lg:flex w-48 shrink-0 flex-col py-3 gap-0.5 border-r"
        style={{ backgroundColor: "#0a1628", borderColor: "#1e3a5f" }}
      >
        {nav.map(({ href, label, icon: Icon, disabled }) => {
          if (disabled) {
            return (
              <div
                key={href}
                title="Coming soon"
                className="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-bold cursor-not-allowed select-none"
                style={{ color: "#475569" }}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </div>
            );
          }
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={navHref(href)}
              className="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={active ? { backgroundColor: "#1e3a5f", color: "#93c5fd" } : { color: "#94a3b8" }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "#1e3a5f30";
                  (e.currentTarget as HTMLElement).style.color = "#cbd5e1";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "#94a3b8";
                }
              }}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}

        {/* Global device filter — desktop (hidden for maestro since sonda is fixed) */}
        {devices.length > 0 && !sondaFija && (
          <DesktopSondaFilter
            devices={devices}
            selectedSonda={selectedSonda}
            onSelect={handleFilterChange}
          />
        )}
        {sondaFija && devices.length > 0 && (
          <div className="mx-3 mt-4 pt-3 border-t" style={{ borderColor: "#1e3a5f" }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Monitor className="w-3.5 h-3.5" style={{ color: "#64748b" }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>
                Mi Escuela
              </span>
            </div>
            <p className="text-xs truncate" style={{ color: "#93c5fd" }}>
              {devices[0]?.nombre || sondaFija}
            </p>
          </div>
        )}

        <div className="mt-auto mx-3 pt-3 border-t" style={{ borderColor: "#1e3a5f" }}>
          <p className="text-xs" style={{ color: "#64748b" }}>MINED · Red Educativa</p>
          <p className="text-xs mt-0.5" style={{ color: "#475569" }}>v1.0 — 2025</p>
        </div>
      </aside>

      {/* Bottom nav — mobile */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t"
        style={{ backgroundColor: "#0a1628", borderColor: "#1e3a5f" }}
      >
        {nav.map(({ href, label, icon: Icon, disabled }) => {
          if (disabled) {
            return (
              <div
                key={href}
                title="Coming soon"
                className="flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-bold cursor-not-allowed select-none"
                style={{ color: "#475569" }}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px]">{label}</span>
              </div>
            );
          }
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={navHref(href)}
              className="flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors"
              style={{ color: active ? "#93c5fd" : "#64748b" }}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
