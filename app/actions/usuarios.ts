"use server";

import { getSession } from "@/lib/auth";
import { createUser, updateUser, deleteUser, getUserById } from "@/lib/usuarios";
import type { Role } from "@/lib/roles";
import { redirect } from "next/navigation";

export type UserFormState = { error?: string; success?: boolean } | undefined;
export type BulkState =
  | {
      error?: string;
      resumen?: { creados: number; omitidos: string[]; errores: { email: string; msg: string }[] };
    }
  | undefined;

async function requireAdmin() {
  const session = await getSession();
  if (!session) throw new Error("No autorizado");
  // Verificar contra DB (el role en la cookie puede estar staleado)
  const fresh = await getUserById(session.userId).catch(() => null);
  if (!fresh || fresh.role !== "admin") {
    throw new Error("No autorizado");
  }
  return session;
}

export async function createUserAction(
  _prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  await requireAdmin();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as Role;

  if (!email || !password || !role) {
    return { error: "Usuario, contraseña y rol son requeridos." };
  }

  try {
    await createUser({ email, password, nombre: email, role, zona_asignada: null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/duplicate key|unique/i.test(msg)) {
      return { error: "Ya existe un usuario con ese nombre." };
    }
    console.error("createUser failed:", err);
    return { error: `Error al crear usuario: ${msg}` };
  }

  redirect("/admin");
}

export async function updateUserAction(
  _prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  await requireAdmin();

  const id = formData.get("id") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as Role;
  const password = formData.get("password") as string;

  if (!id || !email || !role) {
    return { error: "Campos requeridos faltantes." };
  }

  try {
    await updateUser(id, {
      email,
      role,
      ...(password ? { password } : {}),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("updateUser failed:", err);
    return { error: `Error al actualizar usuario: ${msg}` };
  }

  redirect("/admin");
}

// Alta masiva: pega varios correos + una contraseña genérica común + un rol para
// todo el lote. Cada usuario nace con requiere_cambio_pwd=true (cambia en su 1er login).
export async function createUsersBulkAction(
  _prevState: BulkState,
  formData: FormData,
): Promise<BulkState> {
  await requireAdmin();

  const emailsRaw = (formData.get("emails") as string) || "";
  const password = (formData.get("password") as string) || "";
  const role = (formData.get("role") as Role) || "operador";

  if (!password) return { error: "La contraseña genérica es requerida." };

  // Separa por línea, coma, punto y coma o espacios; normaliza y deduplica.
  const emails = Array.from(
    new Set(
      emailsRaw
        .split(/[\s,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  if (emails.length === 0) return { error: "Ingresa al menos un correo." };

  const omitidos: string[] = [];
  const errores: { email: string; msg: string }[] = [];
  let creados = 0;

  for (const email of emails) {
    if (!email.includes("@")) {
      errores.push({ email, msg: "correo inválido" });
      continue;
    }
    const nombre = email.split("@")[0];
    try {
      await createUser({ email, password, nombre, role, zona_asignada: null, requiereCambioPwd: true });
      creados++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/duplicate key|unique/i.test(msg)) {
        omitidos.push(email);
      } else {
        errores.push({ email, msg: msg.slice(0, 120) });
      }
    }
  }

  return { resumen: { creados, omitidos, errores } };
}

export async function deleteUserAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  if (!id) return;
  await deleteUser(id);
  redirect("/admin");
}
