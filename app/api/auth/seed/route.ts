import { NextRequest, NextResponse } from "next/server";
import { createUser, getUserByEmail } from "@/lib/usuarios";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-seed-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { email, password, nombre } = body;

  if (!email || !password || !nombre) {
    return NextResponse.json({ error: "email, password y nombre son requeridos" }, { status: 400 });
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "El usuario ya existe" }, { status: 409 });
  }

  const id = await createUser({
    email,
    password,
    nombre,
    role: "admin",
    zona_asignada: null,
  });

  return NextResponse.json({ ok: true, id });
}
