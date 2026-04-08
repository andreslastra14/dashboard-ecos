import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

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

// Dispositivo — latest state from `dispositivos` collection
export interface Dispositivo {
  id: string; // doc ID = CPU serial
  cpu_id: string;
  id_hardware: string;
  version_sonda: string;
  online: boolean;
  ultimo_reporte: FirebaseFirestore.Timestamp;
  download_mbps: number;
  latitud: number;
  longitud: number;
  gps_status: string;
  cpu_usage: number;
  ram_usage: number;
  disk_usage: number;
  temp_cpu: string;
  web_check_mined: string;
  web_check_streaming: string;
  web_check_adultos: string;
  web_check_apuestas: string;
  ups_status: string;
  ups_nivel: number;
  ups_conectada: boolean;
  ups_modo: string;
  link_rpi_connect: string;
  alerta_enviada: boolean;
  ticket_activo: boolean;
}

// Inventario — school fixed info from `Inventario_Sondas`
export interface Escuela {
  id: string;
  nombre_escuela: string;
  contacto_principal: string;
  tel_principal: string;
  email_principal: string;
  contacto_secundario: string;
  tel_secundario: string;
  email_secundario: string;
  direccion: string;
  latitud_fija: number;
  longitud_fija: number;
  conectividad: string;
  cod_ce: string;
}

// Caso (ticket) from `casos` collection
export interface Caso {
  id: string;
  id_caso: string;
  Nombre_Escuela: string;
  cpu_id: string;
  motivo_reporte: string;
  estado: "Abierto" | "En Proceso" | "Cerrado";
  fecha_apertura: FirebaseFirestore.Timestamp;
  tipo_ticket: string;
  comentarios: string;
  ticket_operador: string;
  ultima_actualizacion: FirebaseFirestore.Timestamp;
  ubicacion: string;
}

// Registro histórico from `registros` collection (same as Dispositivo + timestamp)
export interface RegistroHistorico {
  id: string;
  cpu_id: string;
  download_mbps: number;
  latitud: number;
  longitud: number;
  online: boolean;
  web_check_mined: string;
  web_check_streaming: string;
  web_check_adultos: string;
  web_check_apuestas: string;
  ups_status: string;
  ups_nivel: number;
  cpu_usage: number;
  ram_usage: number;
  timestamp: FirebaseFirestore.Timestamp;
}
