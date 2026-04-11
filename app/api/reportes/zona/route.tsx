import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { ZoneReportDocument } from "@/lib/pdf/ZoneReport";
import { getReportData } from "@/lib/pdf/report-data";
import { getSession } from "@/lib/auth";
import { DEPARTAMENTOS } from "@/lib/geo";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Parse parameters
  const zonasParam = req.nextUrl.searchParams.get("zonas");
  const desdeParam = req.nextUrl.searchParams.get("desde");
  const hastaParam = req.nextUrl.searchParams.get("hasta");

  if (!zonasParam) {
    return NextResponse.json({ error: "Parametro 'zonas' requerido" }, { status: 400 });
  }

  const zonas = zonasParam.split(",").map((z) => z.trim()).filter(Boolean);
  if (zonas.length === 0) {
    return NextResponse.json({ error: "Debe seleccionar al menos una zona" }, { status: 400 });
  }

  // Validate zone names
  const validNames = DEPARTAMENTOS.map((d) => d.nombre);
  for (const z of zonas) {
    if (!validNames.includes(z)) {
      return NextResponse.json({ error: `Zona no valida: ${z}` }, { status: 400 });
    }
  }

  // Check zone access for supervisors
  if (session.role === "supervisor" && session.zonaAsignada) {
    const unauthorized = zonas.filter((z) => z !== session.zonaAsignada);
    if (unauthorized.length > 0) {
      return NextResponse.json({ error: `Sin acceso a: ${unauthorized.join(", ")}` }, { status: 403 });
    }
  }

  // Parse dates (default: last 7 days)
  const now = new Date();
  const hasta = hastaParam ? new Date(hastaParam + "T23:59:59") : now;
  const defaultDesde = new Date(now);
  defaultDesde.setDate(defaultDesde.getDate() - 7);
  const desde = desdeParam ? new Date(desdeParam + "T00:00:00") : defaultDesde;

  // Max range: 365 days
  const diffDays = (hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > 365) {
    return NextResponse.json({ error: "Rango maximo: 365 dias" }, { status: 400 });
  }
  if (diffDays < 0) {
    return NextResponse.json({ error: "Fecha 'desde' debe ser anterior a 'hasta'" }, { status: 400 });
  }

  const data = await getReportData(zonas, desde, hasta);
  const buffer = await renderToBuffer(<ZoneReportDocument data={data} />);
  const bytes = new Uint8Array(buffer);

  const safeName = zonas.length === 1
    ? zonas[0].normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")
    : `${zonas.length}-departamentos`;
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reporte-${safeName}-${date}.pdf"`,
    },
  });
}
