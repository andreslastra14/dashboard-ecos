export interface Departamento {
  nombre: string;
  bounds: { latMin: number; latMax: number; lngMin: number; lngMax: number };
  center: { lat: number; lng: number };
}

export const DEPARTAMENTOS: Departamento[] = [
  { nombre: "Ahuachapán", bounds: { latMin: 13.7, latMax: 14.1, lngMin: -90.1, lngMax: -89.7 }, center: { lat: 13.92, lng: -89.85 } },
  { nombre: "Santa Ana", bounds: { latMin: 13.8, latMax: 14.45, lngMin: -89.7, lngMax: -89.3 }, center: { lat: 14.0, lng: -89.55 } },
  { nombre: "Sonsonate", bounds: { latMin: 13.5, latMax: 13.9, lngMin: -89.9, lngMax: -89.5 }, center: { lat: 13.72, lng: -89.72 } },
  { nombre: "Chalatenango", bounds: { latMin: 14.0, latMax: 14.45, lngMin: -89.3, lngMax: -88.7 }, center: { lat: 14.18, lng: -88.94 } },
  { nombre: "La Libertad", bounds: { latMin: 13.45, latMax: 13.85, lngMin: -89.55, lngMax: -89.1 }, center: { lat: 13.68, lng: -89.32 } },
  { nombre: "San Salvador", bounds: { latMin: 13.6, latMax: 13.85, lngMin: -89.3, lngMax: -89.05 }, center: { lat: 13.7, lng: -89.19 } },
  { nombre: "Cuscatlán", bounds: { latMin: 13.6, latMax: 13.95, lngMin: -89.1, lngMax: -88.8 }, center: { lat: 13.78, lng: -88.95 } },
  { nombre: "La Paz", bounds: { latMin: 13.25, latMax: 13.65, lngMin: -89.15, lngMax: -88.7 }, center: { lat: 13.5, lng: -88.95 } },
  { nombre: "Cabañas", bounds: { latMin: 13.75, latMax: 14.1, lngMin: -88.85, lngMax: -88.5 }, center: { lat: 13.9, lng: -88.65 } },
  { nombre: "San Vicente", bounds: { latMin: 13.45, latMax: 13.8, lngMin: -88.85, lngMax: -88.5 }, center: { lat: 13.64, lng: -88.78 } },
  { nombre: "Usulután", bounds: { latMin: 13.15, latMax: 13.6, lngMin: -88.7, lngMax: -88.2 }, center: { lat: 13.35, lng: -88.45 } },
  { nombre: "San Miguel", bounds: { latMin: 13.25, latMax: 13.8, lngMin: -88.4, lngMax: -87.9 }, center: { lat: 13.48, lng: -88.18 } },
  { nombre: "Morazán", bounds: { latMin: 13.6, latMax: 14.0, lngMin: -88.2, lngMax: -87.7 }, center: { lat: 13.78, lng: -88.1 } },
  { nombre: "La Unión", bounds: { latMin: 13.15, latMax: 13.95, lngMin: -88.0, lngMax: -87.65 }, center: { lat: 13.5, lng: -87.84 } },
];

export function clasificarPorDepartamento(lat: number, lng: number): string | null {
  for (const dept of DEPARTAMENTOS) {
    if (
      lat >= dept.bounds.latMin && lat <= dept.bounds.latMax &&
      lng >= dept.bounds.lngMin && lng <= dept.bounds.lngMax
    ) {
      return dept.nombre;
    }
  }
  return null;
}

export function getDepartamento(nombre: string): Departamento | undefined {
  return DEPARTAMENTOS.find(d => d.nombre === nombre);
}
