import "server-only";
import { getDb } from "./firebase";
import bcrypt from "bcryptjs";
import type { Role } from "./auth";

export interface Usuario {
  id: string;
  email: string;
  password_hash: string;
  nombre: string;
  role: Role;
  zona_asignada: string | null;
  activo: boolean;
  creado: string;
  ultimo_login: string | null;
}

const col = () => getDb().collection("usuarios");

export async function getUserByEmail(email: string): Promise<Usuario | null> {
  const snap = await col().where("email", "==", email.toLowerCase()).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as Usuario;
}

export async function getUserById(id: string): Promise<Usuario | null> {
  const doc = await col().doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Usuario;
}

export async function getAllUsers(): Promise<Usuario[]> {
  const snap = await col().orderBy("nombre").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Usuario);
}

export async function createUser(data: {
  email: string;
  password: string;
  nombre: string;
  role: Role;
  zona_asignada: string | null;
}): Promise<string> {
  const hash = await bcrypt.hash(data.password, 10);
  const ref = await col().add({
    email: data.email.toLowerCase(),
    password_hash: hash,
    nombre: data.nombre,
    role: data.role,
    zona_asignada: data.zona_asignada,
    activo: true,
    creado: new Date().toISOString(),
    ultimo_login: null,
  });
  return ref.id;
}

export async function updateUser(
  id: string,
  data: Partial<{
    email: string;
    password: string;
    nombre: string;
    role: Role;
    zona_asignada: string | null;
    activo: boolean;
  }>
) {
  const update: Record<string, unknown> = {};
  if (data.email !== undefined) update.email = data.email.toLowerCase();
  if (data.nombre !== undefined) update.nombre = data.nombre;
  if (data.role !== undefined) update.role = data.role;
  if (data.zona_asignada !== undefined) update.zona_asignada = data.zona_asignada;
  if (data.activo !== undefined) update.activo = data.activo;
  if (data.password) update.password_hash = await bcrypt.hash(data.password, 10);
  await col().doc(id).update(update);
}

export async function deleteUser(id: string) {
  await col().doc(id).delete();
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<Usuario | null> {
  const user = await getUserByEmail(email);
  if (!user || !user.activo) return null;
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;
  await col().doc(user.id).update({ ultimo_login: new Date().toISOString() });
  return user;
}
