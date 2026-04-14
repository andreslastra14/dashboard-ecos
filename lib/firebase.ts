// Tipos compartidos heredados del schema original. El backend real
// es Postgres; ver `lib/postgres.ts` y `lib/queries.ts`.

// Timestamp mínimo compatible con los usos en el UI (toDate, seconds).
export interface DbTimestamp {
  toDate: () => Date;
  seconds: number;
  nanoseconds: number;
}

// Dispositivo — estado actual de una sonda
export interface Dispositivo {
  id: string;
  cpu_id: string;
  id_hardware: string;
  version_sonda: string;
  online: boolean;
  ultimo_reporte: DbTimestamp;
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

// Inventario — info fija de la escuela
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

// Caso (ticket)
export interface Caso {
  id: string;
  id_caso: string;
  Nombre_Escuela: string;
  cpu_id: string;
  motivo_reporte: string;
  estado: "Abierto" | "En Proceso" | "Cerrado";
  fecha_apertura: DbTimestamp;
  tipo_ticket: string;
  comentarios: string;
  ticket_operador: string;
  ultima_actualizacion: DbTimestamp;
  ubicacion: string;
}

// Registro histórico
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
  timestamp: DbTimestamp;
}
