import { getDb, type Ticket } from "./firebase";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

// Get all open/escalated tickets
export async function getTicketsAbiertos(): Promise<Ticket[]> {
  try {
    const db = getDb();
    const snap = await db
      .collection("tickets")
      .where("estado", "in", ["ABIERTO", "ESCALADO"])
      .orderBy("creado", "desc")
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Ticket));
  } catch (err) {
    console.error("getTicketsAbiertos failed:", err);
    return [];
  }
}

// Get recent tickets (all states) for the tickets page
export async function getTicketsRecientes(limite = 100): Promise<Ticket[]> {
  try {
    const db = getDb();
    const snap = await db
      .collection("tickets")
      .orderBy("creado", "desc")
      .limit(limite)
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Ticket));
  } catch (err) {
    console.error("getTicketsRecientes failed:", err);
    return [];
  }
}

// Get open ticket for a specific sonda (to avoid duplicates)
export async function getTicketAbiertoPorSonda(
  serie: string
): Promise<Ticket | null> {
  try {
    const db = getDb();
    const snap = await db
      .collection("tickets")
      .where("serie", "==", serie)
      .where("estado", "in", ["ABIERTO", "ESCALADO"])
      .limit(1)
      .get();
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Ticket;
  } catch (err) {
    console.error("getTicketAbiertoPorSonda failed:", err);
    return null;
  }
}

// Create a new ticket
export async function crearTicket(data: {
  serie: string;
  dispositivo: string;
  ubicacion: { lat: number; lng: number };
  alertas_detalle: string[];
  inicio_desconexion: FirebaseFirestore.Timestamp;
}): Promise<string> {
  const db = getDb();
  const now = Timestamp.now();
  const ref = await db.collection("tickets").add({
    serie: data.serie,
    dispositivo: data.dispositivo,
    ubicacion: data.ubicacion,
    estado: "ABIERTO",
    nivel: "ALERTA_5MIN",
    inicio_desconexion: data.inicio_desconexion,
    ultima_falla: now,
    resolucion: null,
    creado: now,
    actualizado: now,
    duracion_minutos: 0,
    alertas_detalle: data.alertas_detalle,
    notificado: false,
    notas: [`Ticket creado: desconexión detectada >= 5 min`],
  });
  return ref.id;
}

// Escalate ticket to 10min level
export async function escalarTicket(ticketId: string): Promise<void> {
  const db = getDb();
  await db
    .collection("tickets")
    .doc(ticketId)
    .update({
      estado: "ESCALADO",
      nivel: "ALERTA_10MIN",
      actualizado: Timestamp.now(),
      notas: FieldValue.arrayUnion("Escalado: desconexión >= 10 min"),
    });
}

// Resolve ticket
export async function resolverTicket(
  ticketId: string,
  inicioDesconexion: FirebaseFirestore.Timestamp
): Promise<void> {
  const db = getDb();
  const now = Timestamp.now();
  const duracion = Math.round(
    (now.toMillis() - inicioDesconexion.toMillis()) / 60000
  );
  await db
    .collection("tickets")
    .doc(ticketId)
    .update({
      estado: "RESUELTO",
      resolucion: now,
      actualizado: now,
      duracion_minutos: duracion,
      notas: FieldValue.arrayUnion(
        `Resuelto automáticamente tras ${duracion} min de desconexión`
      ),
    });
}

// Get ticket stats for KPIs
export async function getTicketStats(): Promise<{
  abiertos: number;
  escalados: number;
  resueltosHoy: number;
  mttrMinutos: number;
}> {
  try {
    const db = getDb();
    const [abiertoSnap, escaladoSnap] = await Promise.all([
      db.collection("tickets").where("estado", "==", "ABIERTO").get(),
      db.collection("tickets").where("estado", "==", "ESCALADO").get(),
    ]);

    // Resolved today
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hoyTs = Timestamp.fromDate(hoy);

    let resueltosHoy = 0;
    let totalDuracion = 0;
    let countResueltos = 0;

    try {
      const resueltosSnap = await db
        .collection("tickets")
        .where("estado", "==", "RESUELTO")
        .where("resolucion", ">=", hoyTs)
        .get();
      resueltosHoy = resueltosSnap.size;
      for (const doc of resueltosSnap.docs) {
        const t = doc.data();
        if (t.duracion_minutos > 0) {
          totalDuracion += t.duracion_minutos;
          countResueltos++;
        }
      }
    } catch {
      // Index may not exist — skip
    }

    return {
      abiertos: abiertoSnap.size,
      escalados: escaladoSnap.size,
      resueltosHoy,
      mttrMinutos:
        countResueltos > 0 ? Math.round(totalDuracion / countResueltos) : 0,
    };
  } catch (err) {
    console.error("getTicketStats failed:", err);
    return { abiertos: 0, escalados: 0, resueltosHoy: 0, mttrMinutos: 0 };
  }
}
