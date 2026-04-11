import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { ZoneReportDocument } from "@/lib/pdf/ZoneReport";
import { getZoneReportData } from "@/lib/pdf/report-data";
import { getSession } from "@/lib/auth";
import { DEPARTAMENTOS } from "@/lib/geo";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const zona = req.nextUrl.searchParams.get("zona");
  if (!zona) {
    return NextResponse.json({ error: "Parámetro 'zona' requerido" }, { status: 400 });
  }

  // Validate zone name
  if (!DEPARTAMENTOS.find((d) => d.nombre === zona)) {
    return NextResponse.json({ error: "Zona no válida" }, { status: 400 });
  }

  // Check zone access for supervisors
  if (session.role === "supervisor" && session.zonaAsignada !== zona) {
    return NextResponse.json({ error: "Sin acceso a esta zona" }, { status: 403 });
  }

  const data = await getZoneReportData(zona);
  const buffer = await renderToBuffer(<ZoneReportDocument data={data} />);
  const bytes = new Uint8Array(buffer);

  const safeName = zona.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reporte-${safeName}-${date}.pdf"`,
    },
  });
}
