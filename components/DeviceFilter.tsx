"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Monitor } from "lucide-react";

interface DeviceOption {
  id: string;
  nombre: string;
  online: boolean;
}

export function DeviceFilter({ devices }: { devices: DeviceOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = searchParams.get("sonda");

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "#1e3a5f" }}>
        <Monitor className="w-4 h-4" />
        Filtrar sonda
      </div>
      <select
        value={selected || ""}
        onChange={(e) => {
          const val = e.target.value;
          const params = new URLSearchParams(searchParams.toString());
          if (val) params.set("sonda", val);
          else params.delete("sonda");
          router.push(`/?${params.toString()}`);
        }}
        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        <option value="">Todas las sondas</option>
        {devices.map((d) => (
          <option key={d.id} value={d.id}>
            {d.nombre} {d.online ? "" : "(offline)"}
          </option>
        ))}
      </select>
      {selected && (
        <button
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("sonda");
            router.push(`/?${params.toString()}`);
          }}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Ver todas
        </button>
      )}
    </div>
  );
}
