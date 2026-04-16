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
  nombre_usuario: string;
  clave_hash: string;
  rol: string | null;
};

function normalizeRole(raw: string | null | undefined): Role {
  const v = (raw || "").toLowerCase();
  if (v === "admin") return "admin";
  if (v === "supervisor") return "supervisor";
  if (v === "operador") return "operador";
  if (v === "tecnico" || v === "técnico") return "tecnico";
  if (v === "maestro") return "maestro";
  return "operador";
}

function roleToDb(role: Role): string {
  switch (role) {
    case "admin": return "ADMIN";
    case "supervisor": return "SUPERVISOR";
    case "operador": return "OPERADOR";
    case "tecnico": return "TECNICO";
    case "maestro": return "TECNICO";
  }
}

function fromRow(r: UsuarioRow): Usuario {
  return {
    id: `u:${r.id}`,
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

function normalizeId(id: string): number {
  const numeric = id.startsWith("u:") ? parseInt(id.slice(2), 10) : parseInt(id, 10);
  if (!Number.isFinite(numeric)) throw new Error("id invalido");
  return numeric;
}

export async function getUserByEmail(email: string): Promise<Usuario | null> {
  const lower = email.toLowerCase();
  const u = await query<UsuarioRow>(
    `SELECT id, nombre_usuario, clave_hash, rol
     FROM usuarios_ecos WHERE LOWER(nombre_usuario) = $1 LIMIT 1`,
    [lower]
  );
  return u.length ? fromRow(u[0]) : null;
}

export async function getUserById(id: string): Promise<Usuario | null> {
  const numeric = id.startsWith("u:") ? parseInt(id.slice(2), 10) : parseInt(id, 10);
  if (!Number.isFinite(numeric)) return null;
  const rows = await query<UsuarioRow>(
    `SELECT id, nombre_usuario, clave_hash, rol
     FROM usuarios_ecos WHERE id = $1 LIMIT 1`,
    [numeric]
  );
  return rows.length ? fromRow(rows[0]) : null;
}

export async function getAllUsers(): Promise<Usuario[]> {
  const u = await query<UsuarioRow>(
    `SELECT id, nombre_usuario, clave_hash, rol
     FROM usuarios_ecos ORDER BY nombre_usuario`
  );
  return u.map(fromRow);
}

export async function authenticateUser(email: string, password: string): Promise<Usuario | null> {
  const user = await getUserByEmail(email);
  if (!user || !user.password_hash) return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  return ok ? user : null;
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
    `INSERT INTO usuarios_ecos (nombre_usuario, clave_hash, rol)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [data.email.toLowerCase(), hash, roleToDb(data.role)]
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
  if (data.email !== undefined) { sets.push(`nombre_usuario = $${i++}`); vals.push(data.email.toLowerCase()); }
  if (data.role !== undefined) { sets.push(`rol = $${i++}`); vals.push(roleToDb(data.role)); }
  if (data.password) {
    const hash = await bcrypt.hash(data.password, 10);
    sets.push(`clave_hash = $${i++}`);
    vals.push(hash);
  }
  if (sets.length === 0) return;
  vals.push(numeric);
  await query(`UPDATE usuarios_ecos SET ${sets.join(", ")} WHERE id = $${i}`, vals);
}

export async function deleteUser(id: string): Promise<void> {
  const numeric = normalizeId(id);
  await query(`DELETE FROM usuarios_ecos WHERE id = $1`, [numeric]);
}
