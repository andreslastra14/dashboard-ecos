import "server-only";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { cache } from "react";
import { query } from "./postgres";
import type { Role } from "./roles";

// ── Verificador multi-formato de passwords ──────────────────────────────────
// La tabla `usuario` tiene hashes generados por dos backends distintos:
//   - bcrypt (Node):     "$2a$...", "$2b$...", "$2y$..."
//   - Werkzeug (Python): "pbkdf2:sha256:600000$<salt>$<hex>"  o  "scrypt:N:r:p$<salt>$<hex>"
//   - sha256 hex plano:  64 chars 0-9a-f (poco común pero por las dudas)
// Detectamos por prefijo y usamos el verificador adecuado.

async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false;

  // bcrypt
  if (/^\$2[aby]\$/.test(hash)) {
    return bcrypt.compare(plain, hash);
  }

  // Werkzeug pbkdf2 — formato "pbkdf2:<algo>:<iters>$<salt>$<hexhash>"
  if (hash.startsWith("pbkdf2:")) {
    const parts = hash.split("$");
    if (parts.length !== 3) return false;
    const [method, salt, hexHash] = parts;
    const m = method.split(":");
    if (m[0] !== "pbkdf2" || m.length < 3) return false;
    const algo = m[1];
    const iters = parseInt(m[2], 10);
    if (!Number.isFinite(iters) || iters <= 0) return false;
    const keylen = hexHash.length / 2;
    try {
      const derived = crypto.pbkdf2Sync(plain, salt, iters, keylen, algo);
      return crypto.timingSafeEqual(derived, Buffer.from(hexHash, "hex"));
    } catch {
      return false;
    }
  }

  // Werkzeug scrypt — formato "scrypt:N:r:p$<salt>$<hexhash>"
  if (hash.startsWith("scrypt:")) {
    const parts = hash.split("$");
    if (parts.length !== 3) return false;
    const [method, salt, hexHash] = parts;
    const m = method.split(":");
    if (m[0] !== "scrypt" || m.length < 4) return false;
    const N = parseInt(m[1], 10);
    const r = parseInt(m[2], 10);
    const p = parseInt(m[3], 10);
    if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
    const keylen = hexHash.length / 2;
    try {
      const derived = crypto.scryptSync(plain, salt, keylen, {
        N, r, p,
        maxmem: 256 * N * r,
      });
      return crypto.timingSafeEqual(derived, Buffer.from(hexHash, "hex"));
    } catch {
      return false;
    }
  }

  // sha256 hex sin salt (legacy)
  if (/^[0-9a-f]{64}$/i.test(hash)) {
    const digest = crypto.createHash("sha256").update(plain).digest("hex");
    return digest.toLowerCase() === hash.toLowerCase();
  }

  // Texto plano (último recurso para datos no migrados)
  if (hash === plain) return true;

  console.warn("[usuarios] formato de hash no reconocido:", hash.slice(0, 20));
  return false;
}

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

// ── Detección automática de tabla y columnas ────────────────────────────────
// El back canónico usa la tabla `usuario` (singular). Algunos entornos viejos
// tienen `usuarios_ecos`. Las columnas también pueden variar (email vs
// nombre_usuario, password_hash vs clave_hash, rol vs role). Detectamos una
// vez en runtime contra information_schema y cacheamos.

interface SchemaInfo {
  table: string;            // "usuario" | "usuarios_ecos"
  idCol: string;
  emailCol: string;
  passwordCol: string;
  roleCol: string | null;
  nombreCol: string | null; // nombre/apellido si existe distinto del email
  activoCol: string | null;
}

const TABLE_CANDIDATES = ["usuario", "usuarios_ecos", "usuarios"] as const;
const EMAIL_CANDIDATES = ["email", "correo", "username", "usuario", "nombre_usuario", "user"] as const;
const PASSWORD_CANDIDATES = ["password_hash", "clave_hash", "password", "clave", "contrasena", "hash"] as const;
const ROLE_CANDIDATES = ["cargo", "rol", "role", "tipo", "perfil"] as const;
const NOMBRE_CANDIDATES = ["nombre", "nombre_completo", "full_name", "display_name"] as const;
const ACTIVO_CANDIDATES = ["activo", "active", "habilitado", "enabled"] as const;

let schemaCache: SchemaInfo | null = null;
let schemaPromise: Promise<SchemaInfo> | null = null;

async function detectSchema(): Promise<SchemaInfo> {
  if (schemaCache) return schemaCache;
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    // Buscar la primera tabla candidata que exista, en orden de prioridad
    const candidates = Array.from(TABLE_CANDIDATES);
    let table: string | null = null;
    for (const cand of candidates) {
      const found = await query<{ table_schema: string }>(
        `SELECT table_schema
         FROM information_schema.tables
         WHERE table_name = $1
         LIMIT 1`,
        [cand],
      );
      if (found.length) {
        table = cand;
        break;
      }
    }
    if (!table) {
      throw new Error(
        `No se encontró tabla de usuarios. Esperaba una de: ${candidates.join(", ")}`,
      );
    }

    // Listar columnas de esa tabla
    const cols = await query<{ column_name: string; data_type: string }>(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = $1
       ORDER BY ordinal_position`,
      [table],
    );
    const colNames = new Set(cols.map((c) => c.column_name.toLowerCase()));
    const pick = (cands: readonly string[]) =>
      cands.find((c) => colNames.has(c.toLowerCase())) ?? null;

    const idCol = pick(["id", "id_usuario", "usuario_id"]) ?? "id";
    const emailCol = pick(EMAIL_CANDIDATES);
    const passwordCol = pick(PASSWORD_CANDIDATES);
    if (!emailCol) throw new Error(`Tabla ${table} sin columna de email reconocida`);
    if (!passwordCol) throw new Error(`Tabla ${table} sin columna de password reconocida`);

    const info: SchemaInfo = {
      table,
      idCol,
      emailCol,
      passwordCol,
      roleCol: pick(ROLE_CANDIDATES),
      nombreCol: pick(NOMBRE_CANDIDATES),
      activoCol: pick(ACTIVO_CANDIDATES),
    };
    schemaCache = info;
    console.log("[usuarios] schema detectado:", info);
    return info;
  })();
  try {
    return await schemaPromise;
  } finally {
    // Si falla, permitir reintento en próxima invocación
    if (!schemaCache) schemaPromise = null;
  }
}

function normalizeRole(raw: string | null | undefined): Role {
  const v = (raw || "").toLowerCase().trim();
  // Acepta tanto la forma corta ("admin") como la forma en español completa
  // ("Administrador") y mayúsculas indistintamente. La columna `cargo` en la
  // tabla `usuarios` viene mezclada: "Administrador", "SUPERVISOR", "Maestro".
  if (v === "admin" || v === "administrador") return "admin";
  if (v === "supervisor") return "supervisor";
  if (v === "operador" || v === "operator") return "operador";
  if (v === "tecnico" || v === "técnico" || v === "technician") return "tecnico";
  if (v === "maestro" || v === "teacher" || v === "profesor") return "maestro";
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

type RawRow = Record<string, unknown>;

function rowToUsuario(r: RawRow, s: SchemaInfo): Usuario {
  const id = r[s.idCol];
  const email = String(r[s.emailCol] ?? "");
  const passwordHash = String(r[s.passwordCol] ?? "");
  const rolRaw = s.roleCol ? (r[s.roleCol] as string | null) : null;
  const nombreRaw = s.nombreCol ? (r[s.nombreCol] as string | null) : null;
  const activoRaw = s.activoCol ? r[s.activoCol] : true;
  return {
    id: `u:${id}`,
    email: email.toLowerCase(),
    password_hash: passwordHash,
    nombre: nombreRaw || email,
    role: normalizeRole(rolRaw),
    zona_asignada: null,
    sonda_asignada: null,
    activo: activoRaw === false ? false : true,
    creado: new Date().toISOString(),
    ultimo_login: null,
  };
}

function buildSelectCols(s: SchemaInfo): string {
  const cols = [s.idCol, s.emailCol, s.passwordCol];
  if (s.roleCol) cols.push(s.roleCol);
  if (s.nombreCol) cols.push(s.nombreCol);
  if (s.activoCol) cols.push(s.activoCol);
  return cols.map((c) => `"${c}"`).join(", ");
}

function normalizeId(id: string): number {
  const numeric = id.startsWith("u:") ? parseInt(id.slice(2), 10) : parseInt(id, 10);
  if (!Number.isFinite(numeric)) throw new Error("id invalido");
  return numeric;
}

export async function getUserByEmail(email: string): Promise<Usuario | null> {
  const s = await detectSchema();
  const lower = email.toLowerCase();
  const rows = await query<RawRow>(
    `SELECT ${buildSelectCols(s)}
     FROM "${s.table}"
     WHERE LOWER("${s.emailCol}") = $1
     LIMIT 1`,
    [lower],
  );
  return rows.length ? rowToUsuario(rows[0], s) : null;
}

// Cacheada por request — el layout, las páginas admin y los server actions
// la suelen llamar varias veces para refrescar el role del usuario actual.
export const getUserById = cache(async (id: string): Promise<Usuario | null> => {
  const s = await detectSchema();
  const numeric = id.startsWith("u:") ? parseInt(id.slice(2), 10) : parseInt(id, 10);
  if (!Number.isFinite(numeric)) return null;
  const rows = await query<RawRow>(
    `SELECT ${buildSelectCols(s)}
     FROM "${s.table}"
     WHERE "${s.idCol}" = $1
     LIMIT 1`,
    [numeric],
  );
  return rows.length ? rowToUsuario(rows[0], s) : null;
});

export async function getAllUsers(): Promise<Usuario[]> {
  const s = await detectSchema();
  const rows = await query<RawRow>(
    `SELECT ${buildSelectCols(s)}
     FROM "${s.table}"
     ORDER BY "${s.emailCol}"`,
  );
  return rows.map((r) => rowToUsuario(r, s));
}

export async function authenticateUser(email: string, password: string): Promise<Usuario | null> {
  const user = await getUserByEmail(email);
  if (!user || !user.password_hash) return null;
  if (!user.activo) return null;
  const ok = await verifyPassword(password, user.password_hash);
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
  const s = await detectSchema();
  const hash = await bcrypt.hash(data.password, 10);
  const cols = [`"${s.emailCol}"`, `"${s.passwordCol}"`];
  const vals: unknown[] = [data.email.toLowerCase(), hash];
  if (s.roleCol) {
    cols.push(`"${s.roleCol}"`);
    vals.push(roleToDb(data.role));
  }
  if (s.nombreCol) {
    cols.push(`"${s.nombreCol}"`);
    vals.push(data.nombre);
  }
  const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");
  const rows = await query<{ id: number | string }>(
    `INSERT INTO "${s.table}" (${cols.join(", ")})
     VALUES (${placeholders})
     RETURNING "${s.idCol}" AS id`,
    vals,
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
  }>,
): Promise<void> {
  const s = await detectSchema();
  const numeric = normalizeId(id);
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (data.email !== undefined) { sets.push(`"${s.emailCol}" = $${i++}`); vals.push(data.email.toLowerCase()); }
  if (data.role !== undefined && s.roleCol) { sets.push(`"${s.roleCol}" = $${i++}`); vals.push(roleToDb(data.role)); }
  if (data.nombre !== undefined && s.nombreCol) { sets.push(`"${s.nombreCol}" = $${i++}`); vals.push(data.nombre); }
  if (data.activo !== undefined && s.activoCol) { sets.push(`"${s.activoCol}" = $${i++}`); vals.push(data.activo); }
  if (data.password) {
    const hash = await bcrypt.hash(data.password, 10);
    sets.push(`"${s.passwordCol}" = $${i++}`);
    vals.push(hash);
  }
  if (sets.length === 0) return;
  vals.push(numeric);
  await query(
    `UPDATE "${s.table}" SET ${sets.join(", ")} WHERE "${s.idCol}" = $${i}`,
    vals,
  );
}

export async function deleteUser(id: string): Promise<void> {
  const s = await detectSchema();
  const numeric = normalizeId(id);
  await query(`DELETE FROM "${s.table}" WHERE "${s.idCol}" = $1`, [numeric]);
}
