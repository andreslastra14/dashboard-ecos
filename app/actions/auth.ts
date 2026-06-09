"use server";

import { createSession, deleteSession, getSession } from "@/lib/auth";
import { authenticateUser, updateUser } from "@/lib/usuarios";
import { redirect } from "next/navigation";

export type LoginState = { error?: string } | undefined;
export type ChangePasswordState = { error?: string; ok?: boolean } | undefined;

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Usuario y contraseña son requeridos." };
  }

  let user;
  try {
    user = await authenticateUser(email, password);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[login] authenticateUser falló:", err);
    // Devolver el error real en vez de dejarlo bubblear al error boundary —
    // así el usuario ve el problema concreto (tabla, columna, conexión, etc.)
    return { error: `DB error: ${msg.slice(0, 300)}` };
  }
  if (!user) {
    return { error: "Credenciales incorrectas." };
  }

  await createSession(user);
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

// Cambio de contraseña del propio usuario logueado. Sirve tanto para el cambio
// obligatorio del primer login como para el cambio voluntario desde Configuración.
// No pide la contraseña actual (decisión de producto). No redirige: devuelve estado
// para que el form decida (redirigir en primer login, o mostrar éxito en Configuración).
export async function changePassword(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const session = await getSession();
  if (!session) return { error: "Sesión expirada. Inicia sesión de nuevo." };

  const password = (formData.get("password") as string) || "";
  const confirm = (formData.get("confirm") as string) || "";

  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (password !== confirm) {
    return { error: "Las contraseñas no coinciden." };
  }

  try {
    // updateUser hashea con bcrypt y baja el flag requiere_cambio_pwd + fecha.
    await updateUser(session.userId, { password });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[changePassword] updateUser falló:", err);
    return { error: `Error al guardar: ${msg.slice(0, 200)}` };
  }

  return { ok: true };
}
