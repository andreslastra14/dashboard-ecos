"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { LayoutDashboard, Map, Zap, AlertTriangle, TicketCheck, Monitor, X } from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/escuelas", label: "Mapa", icon: Map },
  { href: "/velocidad", label: "Velocidad", icon: Zap },
  { href: "/alertas", label: "Alertas", icon: AlertTriangle },
  { href: "/tickets", label: "Tickets", icon: TicketCheck },
];

interface DeviceOption {
  id: string;
  nombre: string;
  online: boolean;
}

export function Sidebar({ devices = [] }: { devices?: DeviceOption[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedSonda = searchParams.get("sonda");

  function navHref(href: string) {
    if (!selectedSonda) return href;
    const params = new URLSearchParams();
    params.set("sonda", selectedSonda);
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
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const selectedDevice = devices.find((d) => d.id === selectedSonda);

  return (
    <>
      {/* Sidebar — desktop */}
      <aside
        className="hidden lg:flex w-48 shrink-0 flex-col py-3 gap-0.5 border-r"
        style={{ backgroundColor: "#0a1628", borderColor: "#1e3a5f" }}
      >
        {nav.map(({ href, label, icon: Icon }) => {
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

        {/* Global device filter — desktop */}
        {devices.length > 0 && (
          <div className="mx-3 mt-4 pt-3 border-t" style={{ borderColor: "#1e3a5f" }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Monitor className="w-3.5 h-3.5" style={{ color: "#64748b" }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>
                Filtrar Sonda
              </span>
            </div>
            <select
              value={selectedSonda || ""}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="w-full rounded-md border text-xs px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              style={{ backgroundColor: "#0f1d32", color: "#cbd5e1", borderColor: "#1e3a5f" }}
            >
              <option value="">Todas las sondas</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre} {d.online ? "" : "(off)"}
                </option>
              ))}
            </select>
            {selectedSonda && (
              <button
                onClick={() => handleFilterChange("")}
                className="flex items-center gap-1 mt-1.5 text-[10px] hover:underline"
                style={{ color: "#93c5fd" }}
              >
                <X className="w-3 h-3" /> Limpiar filtro
              </button>
            )}
          </div>
        )}

        <div className="mt-auto mx-3 pt-3 border-t" style={{ borderColor: "#1e3a5f" }}>
          <p className="text-xs" style={{ color: "#64748b" }}>MINED · Red Educativa</p>
          <p className="text-xs mt-0.5" style={{ color: "#475569" }}>v1.0 — 2025</p>
        </div>
      </aside>

      {/* Mobile: sonda indicator bar (below header, above content) */}
      {selectedSonda && (
        <div
          className="lg:hidden fixed top-[52px] left-0 right-0 z-40 flex items-center justify-between px-3 py-1.5 border-b text-xs"
          style={{ backgroundColor: "#0f1d32", borderColor: "#1e3a5f", color: "#93c5fd" }}
        >
          <span className="truncate">
            <Monitor className="w-3 h-3 inline mr-1" />
            {selectedDevice?.nombre || selectedSonda}
          </span>
          <button onClick={() => handleFilterChange("")} className="shrink-0 ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Bottom nav — mobile */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t"
        style={{ backgroundColor: "#0a1628", borderColor: "#1e3a5f" }}
      >
        {nav.map(({ href, label, icon: Icon }) => {
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
