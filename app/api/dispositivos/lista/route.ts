import { NextResponse } from "next/server";
import { getDispositivos, getEscuelas } from "@/lib/queries";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json([], { status: 401 });
  }

  const [dispositivos, escuelas] = await Promise.all([
    getDispositivos(),
    getEscuelas(),
  ]);

  const list = dispositivos.map((d) => {
    const cleanId = (d.cpu_id || d.id).replace(/"/g, "").trim();
    const esc = escuelas[cleanId] ?? escuelas[d.cpu_id] ?? escuelas[d.id];
    return { id: cleanId, nombre: esc?.nombre_escuela || cleanId };
  });

  return NextResponse.json(list);
}
