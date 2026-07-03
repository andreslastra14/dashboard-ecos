import { NextResponse } from "next/server";
import { query } from "@/lib/postgres";

// Endpoint TEMPORAL de diagnóstico de datos de velocidad. Solo lecturas. Se elimina después.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  // Rango de fechas de la tabla (¿desde cuándo hay datos? ¿se borran los viejos?)
  const rango = await query(
    `SELECT to_char(MIN(fecha_registro),'YYYY-MM-DD HH24:MI') AS min_fecha,
            to_char(MAX(fecha_registro),'YYYY-MM-DD HH24:MI') AS max_fecha
     FROM registros_ecos_master`,
  );

  // Por hora en las últimas 12h: cuántos registros y cuántos con velocidad > 0
  const porHora = await query(
    `SELECT to_char(date_trunc('hour', fecha_registro),'DD HH24:MI') AS hora,
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE eth_download > 0)::int AS con_eth,
            COUNT(*) FILTER (WHERE wifi_download > 0)::int AS con_wifi,
            ROUND(MAX(eth_download)::numeric, 1) AS max_eth
     FROM registros_ecos_master
     WHERE fecha_registro >= (SELECT MAX(fecha_registro) FROM registros_ecos_master) - INTERVAL '12 hours'
     GROUP BY 1
     ORDER BY 1`,
  );

  // Muestra de valores reales recientes
  const muestra = await query(
    `SELECT sonda_id, to_char(fecha_registro,'DD HH24:MI') AS h, eth_download, wifi_download
     FROM registros_ecos_master
     WHERE fecha_registro >= (SELECT MAX(fecha_registro) FROM registros_ecos_master) - INTERVAL '12 hours'
     ORDER BY fecha_registro DESC
     LIMIT 6`,
  );

  return NextResponse.json({ rango, porHora, muestra });
}
