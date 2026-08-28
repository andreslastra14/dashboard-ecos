"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Logout as LogOut, DocumentDownload as FileDown, Renew as RefreshCw, Settings, ChevronDown } from "@carbon/icons-react";
import { logout } from "@/app/actions/auth";
import { useRouter, usePathname } from "next/navigation";
import { ReportModal } from "./ReportModal";
import { Printer } from "@carbon/icons-react";
import { SondaSpotlightSearch, type SondaSearchDevice } from "./SondaSpotlightSearch";

function LiveDate() {
  const date = useMemo(
    () => new Date().toLocaleDateString("es-SV", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/El_Salvador" }),
    [],
  );

  return (
    <div className="text-xs px-2 py-1 rounded font-mono hidden sm:block" style={{ backgroundColor: "#0062a8", color: "#93c5fd" }}>
      {date}
    </div>
  );
}


interface HeaderProps {
  userName?: string;
  canGenerateReport?: boolean;
  userZona?: string | null;
  devices?: SondaSearchDevice[];
  sondaFija?: string | null;
}

// Menú del usuario: clic en el nombre → desplegable con Configuración y Cerrar sesión.
function UserMenu({ userName }: { userName: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors hover:bg-white/10"
        title="Menú de usuario"
      >
        <span className="text-xs hidden sm:inline" style={{ color: "#cbd5e1" }}>{userName}</span>
        <ChevronDown size={14} style={{ color: "#94a3b8" }} />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 w-44 rounded-lg border shadow-xl overflow-hidden z-50"
          style={{ backgroundColor: "#0f1d32", borderColor: "#0062a8" }}
        >
          <Link
            href="/configuracion"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-white/5"
            style={{ color: "#cbd5e1" }}
          >
            <Settings size={16} style={{ color: "#94a3b8" }} />
            Configuración
          </Link>
          <form action={logout} className="border-t" style={{ borderColor: "#0062a8" }}>
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-white/5 text-left"
              style={{ color: "#cbd5e1" }}
            >
              <LogOut size={16} style={{ color: "#94a3b8" }} />
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function Header({ userName, canGenerateReport, userZona, devices = [], sondaFija }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [reportOpen, setReportOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const refreshingRef = useRef(false);

  const isDashboardSla = pathname === "/";

  const refreshDashboard = useCallback((showSpinner = false) => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    if (showSpinner) setSpinning(true);
    router.refresh();
    window.setTimeout(() => {
      refreshingRef.current = false;
      if (showSpinner) setSpinning(false);
    }, 1000);
  }, [router]);

  const handleRefresh = useCallback(() => {
    refreshDashboard(true);
  }, [refreshDashboard]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshDashboard();
      }
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [refreshDashboard]);

  const handleReportClick = useCallback(() => {
    if (isDashboardSla) {
      window.print();
    } else {
      setReportOpen(true);
    }
  }, [isDashboardSla]);

  return (
    <>
      <header className="flex items-center gap-3 px-4 lg:px-6 py-2.5 z-10 border-b shrink-0" style={{ backgroundColor: "#04263e", borderColor: "#0062a8" }}>
        <div className="shrink-0">
          <Image
            src="/brand/rapidnet-logo-256.png"
            alt="RapidNet"
            width={110}
            height={28}
            className="rounded bg-white p-1 object-contain"
          />
        </div>

        <div className="flex flex-col min-w-0">
          <span className="text-white font-bold text-sm leading-tight tracking-wide uppercase truncate">
            RapidNet
          </span>
          <span className="text-blue-400 text-xs leading-tight truncate">
            Monitoreo de Red Corporativa · El Salvador
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <SondaSpotlightSearch devices={devices} sondaFija={sondaFija} />
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-md transition-colors hover:bg-white/10"
            title="Actualizar datos"
          >
            <RefreshCw
              size={16}
              className={spinning ? "animate-spin" : ""}
              style={{ color: "#94a3b8" }}
            />
          </button>

          {canGenerateReport && (
            <button
              onClick={handleReportClick}
              className="no-print inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all hover:brightness-110"
              style={{ backgroundColor: "#0062a8", color: "#93c5fd" }}
              title={isDashboardSla ? "Imprimir Reporte SLA" : "Generar Reporte PDF"}
            >
              {isDashboardSla ? <Printer size={14} /> : <FileDown size={14} />}
              <span className="hidden sm:inline">{isDashboardSla ? "Imprimir SLA" : "Reporte"}</span>
            </button>
          )}

          <LiveDate />
          {userName && <UserMenu userName={userName} />}
        </div>
      </header>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        userZona={userZona}
      />
    </>
  );
}
