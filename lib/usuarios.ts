import "server-only";
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
  return u.length ? fromUsuarios(u[0]) : null;
}

export async function getUserById(id: string): Promise<Usuario | null> {
  const numeric = id.startsWith("u:") ? parseInt(id.slice(2), 10) : parseInt(id, 10);
  if (!Number.isFinite(numeric)) return null;
  const rows = await query<UsuarioRow>(
    `SELECT id, nombre, correo, cargo, password_hash, activo, fecha_creacion
     FROM usuarios WHERE id = $1 LIMIT 1`,
    [numeric]
  );
  return rows.length ? fromUsuarios(rows[0]) : null;
}

export async function getAllUsers(): Promise<Usuario[]> {
  const u = await query<UsuarioRow>(
    `SELECT id, nombre, correo, cargo, password_hash, activo, fecha_creacion
     FROM usuarios WHERE activo = true ORDER BY nombre`
  );
  return u.map(fromUsuarios);
}

export async function authenticateUser(email: string, password: string): Promise<Usuario | null> {
  const user = await getUserByEmail(email);
  if (!user || !user.activo || !user.password_hash) return null;
  const ok = await bcrypt.compare(password, user.password_hash);
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
