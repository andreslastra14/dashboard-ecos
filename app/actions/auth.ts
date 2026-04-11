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
    return { error: "Email y contraseña son requeridos." };
  }

  const user = await authenticateUser(email, password);
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
