import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";

// Endpoint TEMPORAL de diagnóstico. Solo lecturas. Se elimina después.
// Ahora mide dos estrategias para getDispositivos (última fila por sonda):
//  A) CTE MATERIALIZED sobre 24h + DISTINCT ON  (la actual, ~10s)
//  B) LATERAL: lista de sondas desde `escuelas` + seek al índice (sonda_id, fecha DESC) LIMIT 1
export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function timed(name: string, sql: string) {
  const t = Date.now();
  try {
    const rows = await query(sql);
    return { name, ms: Date.now() - t, filas: rows.length };
  } catch (e) {
    return { name, ms: Date.now() - t, error: (e as Error).message.slice(0, 120) };
  }
}

export async function GET() {
  // ¿escuelas.sonda_id casa con registros_ecos_master.sonda_id?
  const match = await query(
    `SELECT
       (SELECT COUNT(*) FROM escuelas WHERE sonda_id IS NOT NULL)::int AS escuelas_con_sonda,
       (SELECT COUNT(DISTINCT sonda_id) FROM registros_ecos_master)::int AS sondas_en_telemetria,
       (SELECT COUNT(*) FROM escuelas e
          WHERE EXISTS (SELECT 1 FROM registros_ecos_master r WHERE r.sonda_id = e.sonda_id))::int AS escuelas_con_telemetria`,
  );

  const a = await timed(
    "A_cte_materialized_24h",
    `WITH recientes AS MATERIALIZED (
       SELECT sonda_id, fecha_registro
       FROM registros_ecos_master
       WHERE sonda_id IS NOT NULL
         AND fecha_registro >= (SELECT MAX(fecha_registro) FROM registros_ecos_master) - INTERVAL '24 hours'
     )
     SELECT DISTINCT ON (sonda_id) sonda_id, fecha_registro
     FROM recientes ORDER BY sonda_id, fecha_registro DESC`,
  );

  const b = await timed(
    "B_lateral_desde_escuelas",
    `SELECT m.sonda_id, m.fecha_registro
     FROM (SELECT DISTINCT sonda_id FROM escuelas WHERE sonda_id IS NOT NULL) e
     CROSS JOIN LATERAL (
       SELECT r.sonda_id, r.fecha_registro
       FROM registros_ecos_master r
       WHERE r.sonda_id = e.sonda_id
       ORDER BY r.fecha_registro DESC
       LIMIT 1
     ) m`,
  );

  return NextResponse.json({ match, a, b });
}
