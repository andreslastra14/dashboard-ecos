"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Map, Zap, AlertTriangle, TicketCheck } from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/escuelas", label: "Mapa", icon: Map },
  { href: "/velocidad", label: "Velocidad", icon: Zap },
  { href: "/alertas", label: "Alertas", icon: AlertTriangle },
  { href: "/tickets", label: "Tickets", icon: TicketCheck },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Sidebar — solo visible en pantallas grandes */}
      <aside
        className="hidden lg:flex w-48 shrink-0 flex-col py-3 gap-0.5 border-r"
        style={{ backgroundColor: "#0a1628", borderColor: "#1e3a5f" }}
      >
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
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

        <div className="mt-auto mx-3 pt-3 border-t" style={{ borderColor: "#1e3a5f" }}>
          <p className="text-xs" style={{ color: "#64748b" }}>MINED · Red Educativa</p>
          <p className="text-xs mt-0.5" style={{ color: "#475569" }}>v1.0 — 2025</p>
        </div>
      </aside>

      {/* Bottom nav — solo visible en móvil */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t"
        style={{ backgroundColor: "#0a1628", borderColor: "#1e3a5f" }}
      >
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
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
