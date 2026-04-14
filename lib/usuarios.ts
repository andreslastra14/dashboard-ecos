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

function roleToCargo(role: Role): string {
  switch (role) {
    case "admin": return "Administrador";
    case "supervisor": return "Supervisor";
    case "operador": return "Operador";
    case "tecnico": return "Analista";
    case "maestro": return "Maestro";
  }
}

function normalizeId(id: string): number {
  const numeric = id.startsWith("u:") ? parseInt(id.slice(2), 10) : parseInt(id, 10);
  if (!Number.isFinite(numeric)) throw new Error("id invalido");
  return numeric;
}

export async function createUser(data: {
  email: string;
  password: string;
  nombre: string;
  role: Role;
  zona_asignada: string | null;
  sonda_asignada?: string | null;
}): Promise<string> {
  const hash = await bcrypt.hash(data.password, 10);
  const rows = await query<{ id: number }>(
    `INSERT INTO usuarios (nombre, correo, cargo, password_hash, activo, fecha_creacion)
     VALUES ($1, $2, $3, $4, true, NOW())
     RETURNING id`,
    [data.nombre, data.email.toLowerCase(), roleToCargo(data.role), hash]
  );
  return `u:${rows[0].id}`;
}

export async function updateUser(
  id: string,
  data: Partial<{
    email: string;
    password: string;
    nombre: string;
    role: Role;
    zona_asignada: string | null;
    sonda_asignada: string | null;
    activo: boolean;
  }>
): Promise<void> {
  const numeric = normalizeId(id);
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (data.email !== undefined) { sets.push(`correo = $${i++}`); vals.push(data.email.toLowerCase()); }
  if (data.nombre !== undefined) { sets.push(`nombre = $${i++}`); vals.push(data.nombre); }
  if (data.role !== undefined) { sets.push(`cargo = $${i++}`); vals.push(roleToCargo(data.role)); }
  if (data.activo !== undefined) { sets.push(`activo = $${i++}`); vals.push(data.activo); }
  if (data.password) {
    const hash = await bcrypt.hash(data.password, 10);
    sets.push(`password_hash = $${i++}`);
    vals.push(hash);
    sets.push(`fecha_ultimo_cambio_pwd = NOW()`);
  }
  if (sets.length === 0) return;
  vals.push(numeric);
  await query(`UPDATE usuarios SET ${sets.join(", ")} WHERE id = $${i}`, vals);
}

export async function deleteUser(id: string): Promise<void> {
  const numeric = normalizeId(id);
  await query(`UPDATE usuarios SET activo = false WHERE id = $1`, [numeric]);
}
