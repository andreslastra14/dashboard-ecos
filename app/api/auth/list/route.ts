import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/postgres";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-seed-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const rows = await query<{ id: number; nombre_usuario: string; rol: string }>(
    "SELECT id, nombre_usuario, rol FROM usuarios_ecos ORDER BY id"
  );

  return NextResponse.json({ ok: true, users: rows });
}
