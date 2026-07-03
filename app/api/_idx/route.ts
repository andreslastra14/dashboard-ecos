import { NextResponse } from "next/server";
import { Pool } from "pg";
import { Connector, IpAddressTypes, AuthTypes } from "@google-cloud/cloud-sql-connector";
import { GoogleAuth } from "google-auth-library";

// Endpoint TEMPORAL: crea los índices que faltan en registros_ecos_master (y web) para que las
// consultas de estado y del gráfico de velocidad sean rápidas. Conexión dedicada como `postgres`
// SIN statement_timeout (CREATE INDEX CONCURRENTLY no corre con timeout ni en transacción).
// Autorizado por el usuario. Se elimina tras correrlo una vez.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET() {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!raw || !process.env.INSTANCE_CONNECTION_NAME || !process.env.DB_PASS) {
    return NextResponse.json({ error: "faltan credenciales (DB_PASS/IAM)" }, { status: 500 });
  }

  const auth = new GoogleAuth({
    credentials: JSON.parse(raw),
    scopes: [
      "https://www.googleapis.com/auth/cloud-platform",
      "https://www.googleapis.com/auth/sqlservice.login",
    ],
  });
  const connector = new Connector({ auth });
  const opts = await connector.getOptions({
    instanceConnectionName: process.env.INSTANCE_CONNECTION_NAME,
    ipType: IpAddressTypes.PUBLIC,
    authType: AuthTypes.PASSWORD,
  });
  const pool = new Pool({
    ...opts,
    database: process.env.DB_NAME,
    user: process.env.DB_USER_SQL || "postgres",
    password: process.env.DB_PASS,
    max: 1,
  });

  const statements = [
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_master_sonda_fecha ON registros_ecos_master (sonda_id, fecha_registro DESC)",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_master_fecha ON registros_ecos_master (fecha_registro DESC)",
    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_web_sonda_sitio_fecha ON resultados_detallados_web (sonda_id, sitio_nombre, fecha_registro DESC)",
  ];
  const out: string[] = [];
  for (const sql of statements) {
    const t = Date.now();
    try {
      await pool.query(sql);
      out.push(`OK (${Date.now() - t}ms) ${sql.slice(50, 95)}`);
    } catch (e) {
      out.push(`ERR ${(e as Error).message}`);
    }
  }
  await pool.end();
  return NextResponse.json({ out });
}
