"use client";

import { FileDown } from "lucide-react";
import { useState } from "react";

export function ReportDownloadButton({
  zona,
  canGenerate,
}: {
  zona: string | null;
  canGenerate: boolean;
}) {
  const [loading, setLoading] = useState(false);

  if (!canGenerate) return null;

  async function handleDownload() {
    if (!zona) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reportes/zona?zona=${encodeURIComponent(zona)}`);
      if (!res.ok) {
        alert("Error al generar reporte");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte-${zona}-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={!zona || loading}
      className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-40"
      style={{ backgroundColor: "#1e3a5f" }}
      title={zona ? `Descargar reporte de ${zona}` : "Seleccione una zona primero"}
    >
      <FileDown className="w-3.5 h-3.5" />
      {loading ? "Generando..." : "Reporte PDF"}
    </button>
  );
}
