"use server";

import { getSession } from "@/lib/auth";
import { createUser, updateUser, deleteUser } from "@/lib/usuarios";
import type { Role } from "@/lib/roles";
import { redirect } from "next/navigation";

export type UserFormState = { error?: string; success?: boolean } | undefined;

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
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

export async function deleteUserAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  if (!id) return;
  await deleteUser(id);
  redirect("/admin");
}
