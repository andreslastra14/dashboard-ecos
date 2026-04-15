import { NextRequest, NextResponse } from "next/server";
import { requestReset } from "@/lib/password-reset";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (typeof email !== "string") {
      return NextResponse.json({ error: "email requerido" }, { status: 400 });
    }
    const result = await requestReset(email);
    return NextResponse.json(result);
  } catch (e) {
    console.error("password-reset/request failed:", e);
    return NextResponse.json({ error: "No se pudo procesar la solicitud" }, { status: 500 });
  }
}
