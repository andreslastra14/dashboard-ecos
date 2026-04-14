import "server-only";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { query } from "./postgres";
import type { Role } from "./roles";

export interface Usuario {
  id: string;
  email: string;
  password_hash: string;
  nombre: string;
  role: Role;
  zona_asignada: string | null;
  sonda_asignada: string | null;
  activo: boolean;
  creado: string;
  ultimo_login: string | null;
}

type UsuarioEcosRow = {
  id: number;
  nombre_usuario: string;
  clave_hash: string;
  rol: string;
};

type UsuarioRow = {
  id: number;
  nombre: string;
  correo: string;
  cargo: string | null;
  password_hash: string;
  activo: boolean;
  fecha_creacion: Date | null;
};

function normalizeRole(raw: string | null | undefined): Role {
  const v = (raw || "").toLowerCase();
  if (v === "admin" || v === "administrador") return "admin";
  if (v === "supervisor") return "supervisor";
  if (v === "operador") return "operador";
  if (v === "tecnico" || v === "técnico" || v === "analista") return "tecnico";
  if (v === "maestro") return "maestro";
  return "operador";
}

function fromUsuariosEcos(r: UsuarioEcosRow): Usuario {
  return {
    id: `ue:${r.id}`,
    email: r.nombre_usuario.toLowerCase(),
    password_hash: r.clave_hash,
    nombre: r.nombre_usuario,
    role: normalizeRole(r.rol),
    zona_asignada: null,
    sonda_asignada: null,
    activo: true,
    creado: new Date().toISOString(),
    ultimo_login: null,
  };
}

function fromUsuarios(r: UsuarioRow): Usuario {
  return {
    id: `u:${r.id}`,
    email: r.correo.toLowerCase(),
    password_hash: r.password_hash,
    nombre: r.nombre,
    role: normalizeRole(r.cargo),
    zona_asignada: null,
    sonda_asignada: null,
    activo: r.activo,
    creado: r.fecha_creacion ? r.fecha_creacion.toISOString() : new Date().toISOString(),
    ultimo_login: null,
  };
}

export async function getUserByEmail(email: string): Promise<Usuario | null> {
  const lower = email.toLowerCase();
  const u = await query<UsuarioRow>(
    `SELECT id, nombre, correo, cargo, password_hash, activo, fecha_creacion
     FROM usuarios WHERE LOWER(correo) = $1 LIMIT 1`,
    [lower]
  );
  if (u.length) return fromUsuarios(u[0]);
  const ue = await query<UsuarioEcosRow>(
    `SELECT id, nombre_usuario, clave_hash, rol FROM usuarios_ecos WHERE LOWER(nombre_usuario) = $1 LIMIT 1`,
    [lower]
  );
  if (ue.length) return fromUsuariosEcos(ue[0]);
  return null;
}

export async function getUserById(id: string): Promise<Usuario | null> {
  if (id.startsWith("ue:")) {
    const rows = await query<UsuarioEcosRow>(
      `SELECT id, nombre_usuario, clave_hash, rol FROM usuarios_ecos WHERE id = $1 LIMIT 1`,
      [parseInt(id.slice(3), 10)]
    );
    return rows.length ? fromUsuariosEcos(rows[0]) : null;
  }
  if (id.startsWith("u:")) {
    const rows = await query<UsuarioRow>(
      `SELECT id, nombre, correo, cargo, password_hash, activo, fecha_creacion
       FROM usuarios WHERE id = $1 LIMIT 1`,
      [parseInt(id.slice(2), 10)]
    );
    return rows.length ? fromUsuarios(rows[0]) : null;
  }
  return null;
}

export async function getAllUsers(): Promise<Usuario[]> {
  const ue = await query<UsuarioEcosRow>(
    `SELECT id, nombre_usuario, clave_hash, rol FROM usuarios_ecos ORDER BY nombre_usuario`
  );
  const u = await query<UsuarioRow>(
    `SELECT id, nombre, correo, cargo, password_hash, activo, fecha_creacion
     FROM usuarios WHERE activo = true ORDER BY nombre`
  );
  return [...ue.map(fromUsuariosEcos), ...u.map(fromUsuarios)];
}

// Passlib PBKDF2-SHA256 adapted-base64 format: $pbkdf2-sha256$iters$salt$hash
function verifyPbkdf2Sha256(hash: string, password: string): boolean {
  try {
    const parts = hash.split("$");
    if (parts.length !== 5 || parts[1] !== "pbkdf2-sha256") return false;
    const iters = parseInt(parts[2], 10);
    const ab64Decode = (s: string) => {
      const std = s.replace(/\./g, "+");
      const pad = std.length % 4 === 0 ? "" : "=".repeat(4 - (std.length % 4));
      return Buffer.from(std + pad, "base64");
    };
    const salt = ab64Decode(parts[3]);
    const expected = ab64Decode(parts[4]);
    const derived = crypto.pbkdf2Sync(password, salt, iters, expected.length, "sha256");
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

async function verifyPassword(stored: string, password: string): Promise<boolean> {
  if (!stored) return false;
  if (stored.startsWith("$pbkdf2-sha256$")) return verifyPbkdf2Sha256(stored, password);
  if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
    return bcrypt.compare(password, stored);
  }
  // Plaintext fallback (usuarios_ecos.clave_hash stores plain text)
  return stored === password;
}

export async function authenticateUser(email: string, password: string): Promise<Usuario | null> {
  const user = await getUserByEmail(email);
  if (!user || !user.activo) return null;
  const ok = await verifyPassword(user.password_hash, password);
  return ok ? user : null;
}

// Admin CRUD is out of scope for the Postgres adapter demo.
export async function createUser(_data: {
  email: string;
  password: string;
  nombre: string;
  role: Role;
  zona_asignada: string | null;
  sonda_asignada?: string | null;
}): Promise<string> {
  throw new Error("createUser no disponible en modo Postgres");
}

export async function updateUser(
  _id: string,
  _data: Partial<{
    email: string;
    password: string;
    nombre: string;
    role: Role;
    zona_asignada: string | null;
    sonda_asignada: string | null;
    activo: boolean;
  }>
): Promise<void> {
  throw new Error("updateUser no disponible en modo Postgres");
}

export async function deleteUser(_id: string): Promise<void> {
  throw new Error("deleteUser no disponible en modo Postgres");
}
