"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

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

function markerColor(status: string, latencia: number): string {
  if (status === "FALLA_RED") return "#ef4444";
  if (latencia > 200) return "#f59e0b";
  return "#22c55e";
}

export function SchoolMap({
  sondas,
  center: centerProp,
  zoom: zoomProp,
}: {
  sondas: Sonda[];
  center?: [number, number];
  zoom?: number;
}) {
  const center: [number, number] = centerProp ?? [13.7942, -88.8965];
  const zoom = zoomProp ?? 8;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%", minHeight: "300px", borderRadius: "inherit" }}
      className="z-0"
    >
      {/* Tiles claros CartoDB Positron — mejor legibilidad */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      {sondas.map((s) => {
        const color = markerColor(s.status, s.latencia_mined);
        return (
          <CircleMarker
            key={s.serie}
            center={[s.lat, s.lng]}
            radius={12}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Popup>
              <div style={{ fontSize: 12, minWidth: 160 }}>
                <p style={{ fontWeight: 700, marginBottom: 4 }}>{s.serie}</p>
                <p>Estado: <strong style={{ color }}>{s.status}</strong></p>
                <p>↓ {s.download_mbps} Mbps &nbsp; ↑ {s.upload_mbps} Mbps</p>
                <p>Latencia MINED: {s.latencia_mined > 0 ? `${s.latencia_mined} ms` : "—"}</p>
                <p style={{ color: "#94a3b8", fontSize: 11, marginTop: 4 }}>{s.fecha}</p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
