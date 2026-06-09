"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Logout as LogOut, DocumentDownload as FileDown, Renew as RefreshCw, Screen as Monitor, Close as X, Search, Settings, ChevronDown } from "@carbon/icons-react";
import { logout } from "@/app/actions/auth";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ReportModal } from "./ReportModal";
import { Printer } from "@carbon/icons-react";

function LiveDate() {
  const [date, setDate] = useState("");
  useEffect(() => {
    setDate(new Date().toLocaleDateString("es-SV", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/El_Salvador" }));
  }, []);
  return (
    <div className="text-xs px-2 py-1 rounded font-mono hidden sm:block" style={{ backgroundColor: "#1e3a5f", color: "#93c5fd" }}>
      {date || "\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0"}
    </div>
  );
}


interface DeviceOption {
  id: string;
  nombre: string;
  online: boolean;
  codigo?: string;
}

interface HeaderProps {
  userName?: string;
  canGenerateReport?: boolean;
  userZona?: string | null;
  devices?: DeviceOption[];
  sondaFija?: string | null;
}

function MobileSondaFilter({ devices, sondaFija }: { devices: DeviceOption[]; sondaFija?: string | null }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedSonda = sondaFija || searchParams.get("sonda");

  const filtered = useMemo(() => {
    if (!search) return devices;
    const term = search.toLowerCase();
    return devices.filter(
      (d) =>
        d.nombre.toLowerCase().includes(term) ||
        d.id.toLowerCase().includes(term) ||
        (d.codigo ?? "").toLowerCase().includes(term)
    );
  }, [devices, search]);

  function selectSonda(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("sonda", id);
    else params.delete("sonda");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
    setOpen(false);
    setSearch("");
  }

  // Don't show if maestro (fixed sonda) or no devices
  if (sondaFija || devices.length === 0) return null;

  const selectedDevice = devices.find((d) => d.id === selectedSonda);

  return (
    <>
      {/* Filter button — mobile only */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden p-1.5 rounded-md transition-colors hover:bg-white/10 relative"
        title="Filtrar por sonda"
      >
        <Monitor size={16} style={{ color: selectedSonda ? "#93c5fd" : "#94a3b8" }} />
        {selectedSonda && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-400" />
        )}
      </button>

      {/* Mobile filter modal */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setOpen(false); setSearch(""); }} />
          <div
            className="relative w-full max-h-[70vh] rounded-t-2xl border-t overflow-hidden"
            style={{ backgroundColor: "#0f1d32", borderColor: "#1e3a5f" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-600" />
            </div>

            <div className="px-4 pb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold" style={{ color: "#e2e8f0" }}>Filtrar por Sonda</h3>
              <button onClick={() => { setOpen(false); setSearch(""); }} className="p-1">
                <X size={16} style={{ color: "#94a3b8" }} />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pb-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#64748b" }} />
                <input
                  type="text"
                  placeholder="Buscar escuela..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  style={{ backgroundColor: "#0a1628", color: "#cbd5e1", borderColor: "#1e3a5f" }}
                  autoFocus
                />
              </div>
            </div>

            {/* Options */}
            <div className="px-4 pb-4 space-y-1 overflow-y-auto max-h-[50vh] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-600" style={{ scrollbarWidth: "thin", scrollbarColor: "#475569 transparent" }}>
              {/* Clear filter option */}
              <button
                onClick={() => selectSonda("")}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all"
                style={
                  !selectedSonda
                    ? { backgroundColor: "#1e3a5f", color: "#93c5fd" }
                    : { color: "#94a3b8" }
                }
              >
                Todas las sondas
              </button>

              {filtered.map((d) => (
                <button
                  key={d.id}
                  onClick={() => selectSonda(d.id)}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between"
                  style={
                    selectedSonda === d.id
                      ? { backgroundColor: "#1e3a5f", color: "#93c5fd" }
                      : { color: "#cbd5e1" }
                  }
                >
                  <div className="min-w-0">
                    <p className="truncate">{d.nombre}</p>
                    <p className="text-[10px] font-mono opacity-50">{d.codigo ? `CE ${d.codigo}` : d.id}</p>
                  </div>
                  <span
                    className="w-2 h-2 rounded-full shrink-0 ml-2"
                    style={{ backgroundColor: d.online ? "#4ade80" : "#ef4444" }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile sonda indicator bar */}
      {selectedSonda && (
        <div
          className="lg:hidden fixed top-[52px] left-0 right-0 z-40 flex items-center justify-between px-3 py-1.5 border-b text-xs"
          style={{ backgroundColor: "#0f1d32", borderColor: "#1e3a5f", color: "#93c5fd" }}
        >
          <span className="truncate">
            <Monitor size={12} className="inline mr-1" />
            {selectedDevice?.nombre || selectedSonda}
          </span>
          <button onClick={() => selectSonda("")} className="shrink-0 ml-2">
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
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
          style={{ backgroundColor: "#0f1d32", borderColor: "#1e3a5f" }}
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
          <form action={logout} className="border-t" style={{ borderColor: "#1e3a5f" }}>
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
  const searchParams = useSearchParams();
  const [reportOpen, setReportOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);

  const isDashboardSla = pathname === "/";

  // Estado del badge: si hay una sonda filtrada, refleja SU estado; si no, si hay alguna online.
  const selectedSonda = sondaFija || searchParams.get("sonda");
  const selectedDevice = selectedSonda ? devices.find((d) => d.id === selectedSonda) : null;
  const sistemaActivo = selectedDevice
    ? selectedDevice.online
    : devices.length === 0 || devices.some((d) => d.online);

  const handleRefresh = useCallback(() => {
    setSpinning(true);
    router.refresh();
    setTimeout(() => setSpinning(false), 1000);
  }, [router]);

  const handleReportClick = useCallback(() => {
    if (isDashboardSla) {
      window.print();
    } else {
      setReportOpen(true);
    }
  }, [isDashboardSla]);

  return (
    <>
      <header className="flex items-center gap-3 px-4 lg:px-6 py-2.5 z-10 border-b shrink-0" style={{ backgroundColor: "#0a1628", borderColor: "#1e3a5f" }}>
        <div className="shrink-0">
          <Image
            src="/brand/ecos-icon-128.png"
            alt="ECOS"
            width={40}
            height={40}
            className="rounded object-contain"
          />
        </div>

        <div className="flex flex-col min-w-0">
          <span className="text-white font-bold text-sm leading-tight tracking-wide uppercase truncate">
            ECOS
          </span>
          <span className="text-blue-400 text-xs leading-tight truncate">
            Ministerio de Educacion · El Salvador
          </span>
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

          {/* Mobile sonda filter */}
          <MobileSondaFilter devices={devices} sondaFija={sondaFija} />

          {canGenerateReport && (
            <button
              onClick={handleReportClick}
              className="no-print inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all hover:brightness-110"
              style={{ backgroundColor: "#1e3a5f", color: "#93c5fd" }}
              title={isDashboardSla ? "Imprimir Reporte SLA" : "Generar Reporte PDF"}
            >
              {isDashboardSla ? <Printer size={14} /> : <FileDown size={14} />}
              <span className="hidden sm:inline">{isDashboardSla ? "Imprimir SLA" : "Reporte"}</span>
            </button>
          )}

          <div className="flex items-center gap-1.5">
            <div
              aria-hidden="true"
              className={`w-2 h-2 rounded-full ${sistemaActivo ? "bg-green-400 animate-pulse" : "bg-red-500"}`}
            />
            <span
              className="text-xs font-medium hidden sm:inline"
              style={{ color: sistemaActivo ? "#4ade80" : "#ef4444" }}
            >
              {sistemaActivo ? "Activo" : "Inactivo"}
            </span>
          </div>
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
