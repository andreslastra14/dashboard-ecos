"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export interface MapMarker {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
  online: boolean;
  download_mbps: number;
  eth_download_mbps?: number;
  wifi_download_mbps?: number;
  eth_latencia_ms?: number;
  wifi_latencia_ms?: number;
  ups_status: string;
  web_check_mined: string;
  web_check_adultos: string;
}

// Latencia efectiva: peor caso entre eth y wifi.
// 0 = apagada / sin medición. 1–200 = saludable. >200 = alta latencia.
function latenciaEfectiva(marker: MapMarker): number {
  return Math.max(marker.eth_latencia_ms ?? 0, marker.wifi_latencia_ms ?? 0);
}

function markerColor(marker: MapMarker): string {
  // Verde = activa (online), rojo = inactiva (offline).
  return marker.online ? "#22c55e" : "#ef4444";
}

export function SchoolMap({
  markers,
  center: centerProp,
  zoom: zoomProp,
}: {
  markers: MapMarker[];
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
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      {markers.map((m) => {
        const color = markerColor(m);
        const latPeor = latenciaEfectiva(m);
        const estadoLat =
          latPeor === 0 ? "Sin medición" : latPeor <= 200 ? "Normal" : "Alta";
        return (
          <CircleMarker
            key={m.id}
            center={[m.lat, m.lng]}
            radius={12}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Popup>
              <div style={{ fontSize: 12, minWidth: 180 }}>
                <p style={{ fontWeight: 700, marginBottom: 4 }}>{m.nombre}</p>
                <p>
                  Latencia: <strong style={{ color }}>{estadoLat}</strong>
                  {latPeor > 0 ? ` (${latPeor} ms)` : ""}
                </p>
                <p>Estado: <strong>{m.online ? "En linea" : "Desconectado"}</strong></p>
                <p>Ethernet: {(m.eth_download_mbps ?? 0) > 0 ? `${m.eth_download_mbps!.toFixed(1)} Mbps` : "—"}{(m.eth_latencia_ms ?? 0) > 0 ? ` · ${m.eth_latencia_ms} ms` : ""}</p>
                <p>WiFi: {(m.wifi_download_mbps ?? 0) > 0 ? `${m.wifi_download_mbps!.toFixed(1)} Mbps` : "—"}{(m.wifi_latencia_ms ?? 0) > 0 ? ` · ${m.wifi_latencia_ms} ms` : ""}</p>
                <p>MINED: {m.web_check_mined === "ACCESIBLE" ? "Accesible" : "Bloqueado"}</p>
                <p>Filtro: {m.web_check_adultos === "BLOQUEADO" ? "Activo" : "Inactivo"}</p>
                {m.ups_status && <p>UPS: {m.ups_status}</p>}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
