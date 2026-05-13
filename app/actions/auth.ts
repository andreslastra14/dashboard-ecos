"use server";

import { createSession, deleteSession } from "@/lib/auth";
import { authenticateUser } from "@/lib/usuarios";
import { redirect } from "next/navigation";

export type LoginState = { error?: string } | undefined;

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
