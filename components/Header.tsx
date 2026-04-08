"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

function LiveDate() {
  const [date, setDate] = useState("");
  useEffect(() => {
    setDate(new Date().toLocaleDateString("es-SV", { day: "2-digit", month: "short", year: "numeric" }));
  }, []);
  return (
    <div className="text-xs px-2 py-1 rounded font-mono hidden sm:block" style={{ backgroundColor: "#1e3a5f", color: "#93c5fd" }}>
      {date || "\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0"}
    </div>
  );
}

export function Header() {
  return (
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
          Ministerio de Educación
        </span>
        <span className="text-blue-400 text-xs leading-tight truncate">
          Sistema de Monitoreo de Red · El Salvador
        </span>
      </div>

      <div className="ml-auto flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <div aria-hidden="true" className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-xs font-medium hidden sm:inline">Sistema Activo</span>
        </div>
        <LiveDate />
      </div>
    </header>
  );
}
