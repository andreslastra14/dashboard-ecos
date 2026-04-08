"use client";

import dynamic from "next/dynamic";
import type { MapMarker } from "@/components/SchoolMap";

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

export function SchoolMapWrapper({
  markers,
  center,
  zoom,
}: {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
}) {
  return <SchoolMap markers={markers} center={center} zoom={zoom} />;
}
