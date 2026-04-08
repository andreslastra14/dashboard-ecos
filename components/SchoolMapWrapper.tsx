"use client";

import dynamic from "next/dynamic";

const SchoolMap = dynamic(
  () => import("@/components/SchoolMap").then((m) => m.SchoolMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-full w-full flex items-center justify-center text-blue-400 text-sm"
        style={{ backgroundColor: "#0d1f35" }}
      >
        Cargando mapa...
      </div>
    ),
  }
);

interface Sonda {
  serie: string;
  lat: number;
  lng: number;
  status: string;
  download_mbps: number;
  upload_mbps: number;
  fecha: string;
  latencia_mined: number;
}

export function SchoolMapWrapper({
  sondas,
  center,
  zoom,
}: {
  sondas: Sonda[];
  center?: [number, number];
  zoom?: number;
}) {
  return <SchoolMap sondas={sondas} center={center} zoom={zoom} />;
}
