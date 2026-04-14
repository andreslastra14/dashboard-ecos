import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Sistema de tickets deshabilitado: el backend Postgres actual no
  // tiene tabla `casos`. El endpoint permanece para que el cron no
  // falle, pero no ejecuta ninguna acción.
  return NextResponse.json({
    ok: true,
    disabled: true,
    timestamp: new Date().toISOString(),
  });
}
