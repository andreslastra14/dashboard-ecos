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
    // SSO: en producción la cookie vive en el dominio padre para compartirse
    // con install.ecos-app.com (y cualquier subdominio de ecos-app.com).
    ...(process.env.NODE_ENV === "production" ? { domain: ".ecos-app.com" } : {}),
  });
}

export async function verifySession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) return null;
  return decrypt(session);
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  // limpiar también la cookie de dominio compartido (SSO)
  if (process.env.NODE_ENV === "production") {
    cookieStore.set("session", "", { httpOnly: true, secure: true, expires: new Date(0), sameSite: "lax", path: "/", domain: ".ecos-app.com" });
  }
}

export const getSession = cache(verifySession);
