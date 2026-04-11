"use client";

import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { LogOut, FileDown, RefreshCw } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { useRouter } from "next/navigation";
import { ReportModal } from "./ReportModal";

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

function AutoRefreshTimer({ intervalMs }: { intervalMs: number }) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(Math.floor(intervalMs / 1000));

  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          router.refresh();
          return Math.floor(intervalMs / 1000);
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [router, intervalMs]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <span className="text-[10px] font-mono hidden sm:inline" style={{ color: "#475569" }}>
      {mins}:{String(secs).padStart(2, "0")}
    </span>
  );
}

interface HeaderProps {
  userName?: string;
  canGenerateReport?: boolean;
  userZona?: string | null;
}

export function Header({ userName, canGenerateReport, userZona }: HeaderProps) {
  const router = useRouter();
  const [reportOpen, setReportOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);

  const handleRefresh = useCallback(() => {
    setSpinning(true);
    router.refresh();
    setTimeout(() => setSpinning(false), 1000);
  }, [router]);

  return (
    <>
      <header className="flex items-center gap-3 px-4 lg:px-6 py-2.5 z-10 border-b shrink-0" style={{ backgroundColor: "#0a1628", borderColor: "#1e3a5f" }}>
        {/* Logo oficial MINED */}
        <div className="shrink-0">
          <Image
            src="https://upload.wikimedia.org/wikipedia/commons/0/05/Logo_oficial_del_Ministerio_de_Educaci%C3%B3n_de_El_Salvador.png"
            alt="MINED El Salvador"
            width={40}
            height={40}
            className="rounded object-contain"
            style={{ background: "white", padding: "2px" }}
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
          {/* Auto-refresh countdown */}
          <AutoRefreshTimer intervalMs={120000} />

          {/* Manual refresh button */}
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-md transition-colors hover:bg-white/10"
            title="Actualizar datos"
          >
            <RefreshCw
              className={`w-4 h-4 ${spinning ? "animate-spin" : ""}`}
              style={{ color: "#94a3b8" }}
            />
          </button>

          {/* Report button */}
          {canGenerateReport && (
            <button
              onClick={() => setReportOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all hover:brightness-110"
              style={{ backgroundColor: "#1e3a5f", color: "#93c5fd" }}
              title="Generar Reporte PDF"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reporte</span>
            </button>
          )}

          <div className="flex items-center gap-1.5">
            <div aria-hidden="true" className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-xs font-medium hidden sm:inline">Activo</span>
          </div>
          <LiveDate />
          {userName && (
            <div className="flex items-center gap-2">
              <span className="text-xs hidden sm:inline" style={{ color: "#94a3b8" }}>{userName}</span>
              <form action={logout}>
                <button
                  type="submit"
                  className="p-1.5 rounded-md transition-colors hover:bg-white/10"
                  title="Cerrar sesion"
                >
                  <LogOut className="w-4 h-4" style={{ color: "#94a3b8" }} />
                </button>
              </form>
            </div>
          )}
        </div>
      </header>

      {/* Report Modal */}
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        userZona={userZona}
      />
    </>
  );
}
