"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Dashboard as LayoutDashboard, Earth as Globe, Map, Flash as Zap, WarningAlt as AlertTriangle, Tag as TicketCheck, Screen as Monitor, Group as Users, type CarbonIconType } from "@carbon/icons-react";
import type { Role } from "@/lib/roles";
import type { SondaSearchDevice as DeviceOption } from "./SondaSpotlightSearch";

type NavItem = { href: string; label: string; icon: CarbonIconType; disabled?: boolean };

const baseNav: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vista-global", label: "Vista Global", icon: Globe },
  { href: "/escuelas", label: "Mapa", icon: Map },
  { href: "/velocidad", label: "Velocidad", icon: Zap },
  { href: "/alertas", label: "Alertas", icon: AlertTriangle },
  // Tickets deshabilitado (Coming soon) hasta integrar el sistema de Salvatore
  { href: "/tickets", label: "Tickets", icon: TicketCheck, disabled: true },
];

export function Sidebar({ devices = [], userRole, sondaFija }: { devices?: DeviceOption[]; userRole?: Role; sondaFija?: string | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const nav: NavItem[] = userRole === "admin"
    ? [...baseNav, { href: "/admin", label: "Admin", icon: Users }]
    : baseNav;

  function navHref(href: string) {
    const params = new URLSearchParams();
    for (const key of ["sonda", "sondas", "departamento", "zona", "estado"]) {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    }
    if (sondaFija) {
      params.set("sonda", sondaFija);
      params.delete("sondas");
    }
    const qs = params.toString();
    return qs ? `${href}?${qs}` : href;
  }

  return (
    <>
      {/* Sidebar — desktop */}
      <aside
        className="hidden lg:flex w-48 shrink-0 flex-col py-3 gap-0.5 border-r"
        style={{ backgroundColor: "#04263e", borderColor: "#0062a8" }}
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
                <Icon size={16} className="shrink-0" />
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
              style={active ? { backgroundColor: "#0062a8", color: "#93c5fd" } : { color: "#94a3b8" }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "#0062a830";
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
              <Icon size={16} className="shrink-0" />
              {label}
            </Link>
          );
        })}

        {sondaFija && devices.length > 0 && (
          <div className="mx-3 mt-4 pt-3 border-t" style={{ borderColor: "#0062a8" }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Monitor size={14} style={{ color: "#64748b" }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>
                Mi Oficina
              </span>
            </div>
            <p className="text-xs truncate" style={{ color: "#93c5fd" }}>
              {devices[0]?.nombre || sondaFija}
            </p>
          </div>
        )}

        <div className="mt-auto mx-3 pt-3 border-t" style={{ borderColor: "#0062a8" }}>
          <p className="text-xs" style={{ color: "#64748b" }}>RapidNet · Red Corporativa</p>
          <p className="text-xs mt-0.5" style={{ color: "#475569" }}>v1.0 — 2025</p>
        </div>
      </aside>

      {/* Bottom nav — mobile */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t"
        style={{ backgroundColor: "#04263e", borderColor: "#0062a8" }}
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
                <Icon size={20} />
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
              <Icon size={20} />
              <span className="text-[10px]">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
