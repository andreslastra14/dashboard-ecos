import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Get all devices
  const dispSnap = await db.collection("dispositivos").get();
  const escuelasSnap = await db.collection("Inventario_Sondas").get();

  const escuelas: Record<string, string> = {};
  for (const doc of escuelasSnap.docs) {
    escuelas[doc.id] = doc.data().nombre_escuela || "Sin nombre";
  }

  let created = 0;

  for (const doc of dispSnap.docs) {
    const d = doc.data();
    if (d.online === false && !d.ticket_activo) {
      // Create a case for offline device without active ticket
      const idCaso = `ECOS-${new Date().toISOString().slice(0, 10)}-${doc.id.slice(-4)}`;
      await db.collection("casos").add({
        id_caso: idCaso,
        Nombre_Escuela: escuelas[doc.id] || "Escuela desconocida",
        cpu_id: doc.id,
        motivo_reporte: "Desconexión detectada automáticamente",
        estado: "Abierto",
        fecha_apertura: FieldValue.serverTimestamp(),
        tipo_ticket: "AUTO",
        comentarios: "",
        ticket_operador: "SISTEMA_ECOS",
        ultima_actualizacion: FieldValue.serverTimestamp(),
        ubicacion: d.latitud && d.longitud ? `${d.latitud},${d.longitud}` : "",
      });

      // Mark device as having active ticket
      await db.collection("dispositivos").doc(doc.id).update({
        ticket_activo: true,
        alerta_enviada: true,
      });

      created++;
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    created,
    dispositivosAnalizados: dispSnap.size,
  });
}
