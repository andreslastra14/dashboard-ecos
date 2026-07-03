import { NextResponse } from "next/server";
import { getDispositivos, getEscuelas, getCoordsEscuelas, getVelocidadBuckets } from "@/lib/queries";

// Endpoint TEMPORAL de diagnóstico: mide el tiempo de cada consulta del lado del servidor.
// Solo lecturas. Se elimina tras verificar el rendimiento.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const measure = async (name: string, fn: () => Promise<unknown>) => {
    const t = Date.now();
    try {
      const r = await fn();
      const n = Array.isArray(r) ? r.length : r && typeof r === "object" ? Object.keys(r).length : 0;
      return { name, ms: Date.now() - t, n };
    } catch (e) {
      return { name, ms: Date.now() - t, error: (e as Error).message.slice(0, 80) };
    }
  };

  const out = [];
  out.push(await measure("getDispositivos", () => getDispositivos()));
  out.push(await measure("getEscuelas", () => getEscuelas()));
  out.push(await measure("getCoordsEscuelas", () => getCoordsEscuelas()));
  out.push(await measure("getVelocidadBuckets(12h)", () => getVelocidadBuckets(12)));
  return NextResponse.json({ out });
}
