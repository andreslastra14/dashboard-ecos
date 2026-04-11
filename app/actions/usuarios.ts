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
  const nombre = formData.get("nombre") as string;
  const role = formData.get("role") as Role;
  const zona_asignada = (formData.get("zona_asignada") as string) || null;

  if (!email || !password || !nombre || !role) {
    return { error: "Todos los campos son requeridos." };
  }

  try {
    await createUser({ email, password, nombre, role, zona_asignada });
  } catch {
    return { error: "Error al crear usuario. Verifique que el email no esté duplicado." };
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
  const nombre = formData.get("nombre") as string;
  const role = formData.get("role") as Role;
  const zona_asignada = (formData.get("zona_asignada") as string) || null;
  const password = formData.get("password") as string;
  const activo = formData.get("activo") === "true";

  if (!id || !email || !nombre || !role) {
    return { error: "Campos requeridos faltantes." };
  }

  try {
    await updateUser(id, {
      email,
      nombre,
      role,
      zona_asignada,
      activo,
      ...(password ? { password } : {}),
    });
  } catch {
    return { error: "Error al actualizar usuario." };
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
