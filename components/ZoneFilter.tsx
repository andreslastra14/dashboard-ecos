"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Location } from "@carbon/icons-react";

interface ZoneStats {
  nombre: string;
  total: number;
  ok: number;
  falla: number;
}

export function ZoneFilter({ stats }: { stats: ZoneStats[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const departamento = searchParams.get("departamento");

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "#1e3a5f" }}>
        <Location size={16} />
        Filtrar por departamento
      </div>
      <select
        value={departamento || ""}
        onChange={(e) => {
          const val = e.target.value;
          const params = new URLSearchParams(searchParams.toString());
          if (val) params.set("departamento", val);
          else params.delete("departamento");
          router.push(`/escuelas?${params.toString()}`);
        }}
        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        <option value="">Todos los departamentos</option>
        {stats.map((s) => (
          <option key={s.nombre} value={s.nombre}>
            {s.nombre} ({s.total} sondas — {s.falla > 0 ? `${s.falla} fallas` : "OK"})
          </option>
        ))}
      </select>
      {departamento && (
        <button
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("departamento");
            router.push(`/escuelas?${params.toString()}`);
          }}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Limpiar filtro
        </button>
      )}
    </div>
  );
}
