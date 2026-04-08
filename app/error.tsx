"use client";

import { AlertCircle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: "#fef2f2" }}>
        <AlertCircle className="w-7 h-7" style={{ color: "#b91c1c" }} />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-1">Error al cargar datos</h2>
        <p className="text-sm text-slate-500 max-w-sm">
          No se pudo conectar con la base de datos. Verifique la conexión o intente nuevamente.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 mt-2 font-mono">ID: {error.digest}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="px-4 py-2 text-sm font-medium text-white rounded-lg"
        style={{ backgroundColor: "#1e3a5f" }}
      >
        Reintentar
      </button>
    </div>
  );
}
