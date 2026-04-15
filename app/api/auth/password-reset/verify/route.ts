import { NextRequest, NextResponse } from "next/server";
import { verifyAndReset } from "@/lib/password-reset";

export async function POST(req: NextRequest) {
  try {
    const { email, code, password } = await req.json();
    if (typeof email !== "string" || typeof code !== "string" || typeof password !== "string") {
      return NextResponse.json({ error: "email, code y password son requeridos" }, { status: 400 });
    }
    const result = await verifyAndReset(email, code, password);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("password-reset/verify failed:", e);
    return NextResponse.json({ error: "No se pudo procesar la solicitud" }, { status: 500 });
  }
}
