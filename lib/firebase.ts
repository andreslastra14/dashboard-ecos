import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Module-level singleton — safe across concurrent cold-start workers
let db: Firestore | undefined;

export function getDb(): Firestore {
  if (db) return db;
  const app = getApps().length
    ? getApp()
    : initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      });
  db = getFirestore(app);
  return db;
}

export interface Registro {
  id: string;
  fecha: string;
  serie: string;
  dispositivo: string;
  tipo_conexion: string;
  status: "OK" | "FALLA_RED";
  alertas_detalle: string[];
  pings: {
    youtube: number;
    mined: number;
    netflix: number;
    restringido: number;
  };
  download_mbps: number;
  upload_mbps: number;
  ubicacion: { lat: number; lng: number };
  timestamp: FirebaseFirestore.Timestamp;
}

export interface Ticket {
  id: string;
  serie: string;
  dispositivo: string;
  ubicacion: { lat: number; lng: number };
  estado: "ABIERTO" | "ESCALADO" | "RESUELTO";
  nivel: "ALERTA_5MIN" | "ALERTA_10MIN";
  inicio_desconexion: FirebaseFirestore.Timestamp;
  ultima_falla: FirebaseFirestore.Timestamp;
  resolucion: FirebaseFirestore.Timestamp | null;
  creado: FirebaseFirestore.Timestamp;
  actualizado: FirebaseFirestore.Timestamp;
  duracion_minutos: number;
  alertas_detalle: string[];
  notificado: boolean;
  notas: string[];
}
