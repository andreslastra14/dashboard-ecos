import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Role } from "./roles";

export type { Role };

const key = new TextEncoder().encode(process.env.SESSION_SECRET);

export interface SessionPayload {
  userId: string;
  email: string;
  nombre: string;
  role: Role;
  zonaAsignada: string | null;
  sondaAsignada: string | null;
  expiresAt: Date;
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload, expiresAt: payload.expiresAt.toISOString() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function decrypt(session: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(session, key, { algorithms: ["HS256"] });
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      nombre: payload.nombre as string,
      role: payload.role as Role,
      zonaAsignada: (payload.zonaAsignada as string) || null,
      sondaAsignada: (payload.sondaAsignada as string) || null,
      expiresAt: new Date(payload.expiresAt as string),
    };
  } catch {
    return null;
  }
}

export async function createSession(user: {
  id: string;
  email: string;
  nombre: string;
  role: Role;
  zona_asignada: string | null;
  sonda_asignada?: string | null;
}) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await encrypt({
    userId: user.id,
    email: user.email,
    nombre: user.nombre,
    role: user.role,
    zonaAsignada: user.zona_asignada,
    sondaAsignada: user.sonda_asignada || null,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

// Rama demo-rapidnet: sin contraseña — sesión ficticia de solo lectura.
const DEMO = process.env.DEMO_MODE !== "0";
const DEMO_SESSION: SessionPayload = {
  userId: "demo",
  email: "demo@rapidnetsv.com",
  nombre: "Demo RapidNet",
  role: "operador",
  zonaAsignada: null,
  sondaAsignada: null,
  expiresAt: new Date(8640000000000000),
};

export async function verifySession(): Promise<SessionPayload | null> {
  if (DEMO) {
    // Tocar cookies() mantiene la ruta como dinámica (evita que Next intente
    // prerenderizar en build las páginas que dependen de la sesión).
    await cookies();
    return DEMO_SESSION;
  }
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) return null;
  return decrypt(session);
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

export const getSession = cache(verifySession);
