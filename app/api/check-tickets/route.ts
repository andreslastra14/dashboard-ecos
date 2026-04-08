import { NextResponse } from "next/server";
import { getDb, type Registro } from "@/lib/firebase";
import { Timestamp } from "firebase-admin/firestore";
import {
  getTicketAbiertoPorSonda,
  crearTicket,
  escalarTicket,
  resolverTicket,
} from "@/lib/tickets";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const now = Timestamp.now();
  const fiveMinAgo = Timestamp.fromMillis(now.toMillis() - 5 * 60 * 1000);
  const tenMinAgo = Timestamp.fromMillis(now.toMillis() - 10 * 60 * 1000);

  // 1. Get latest record per sonda (last 15 min window)
  const windowStart = Timestamp.fromMillis(now.toMillis() - 15 * 60 * 1000);
  const snap = await db
    .collection("registros")
    .where("timestamp", ">=", windowStart)
    .orderBy("timestamp", "desc")
    .get();

  const registros = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as Registro)
  );

  // Group by sonda — latest record first
  const porSonda: Record<string, Registro[]> = {};
  for (const r of registros) {
    if (!porSonda[r.serie]) porSonda[r.serie] = [];
    porSonda[r.serie].push(r);
  }

  let created = 0,
    escalated = 0,
    resolved = 0;

  for (const [serie, records] of Object.entries(porSonda)) {
    const latest = records[0];
    const ticketExistente = await getTicketAbiertoPorSonda(serie);

    if (latest.status === "FALLA_RED") {
      // Check if all records in the 5-min window are failures
      const recordsIn5min = records.filter(
        (r) => r.timestamp.toMillis() >= fiveMinAgo.toMillis()
      );
      const allFailing =
        recordsIn5min.length >= 3 &&
        recordsIn5min.every((r) => r.status === "FALLA_RED");

      if (!ticketExistente && allFailing) {
        // Create new ticket at 5-min level
        const firstFail = records[records.length - 1]; // oldest failure
        await crearTicket({
          serie,
          dispositivo: latest.dispositivo,
          ubicacion: latest.ubicacion,
          alertas_detalle: latest.alertas_detalle || [],
          inicio_desconexion: firstFail.timestamp,
        });
        created++;
      } else if (ticketExistente && ticketExistente.estado === "ABIERTO") {
        // Check if should escalate (>= 10 min)
        if (
          ticketExistente.inicio_desconexion.toMillis() <= tenMinAgo.toMillis()
        ) {
          await escalarTicket(ticketExistente.id);
          escalated++;
        }
      }
    } else if (latest.status === "OK" && ticketExistente) {
      // Sonda recovered — auto-close ticket
      await resolverTicket(
        ticketExistente.id,
        ticketExistente.inicio_desconexion
      );
      resolved++;
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    created,
    escalated,
    resolved,
    sondasAnalizadas: Object.keys(porSonda).length,
  });
}
