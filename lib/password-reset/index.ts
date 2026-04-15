import "server-only";
import { getUserByEmail, updateUser } from "../usuarios";
import { generateCode, hashCode, verifyCode, CODE_TTL_MINUTES } from "./code";
import { sendResetCodeEmail } from "./email";
import { saveResetCode, getLatestActiveReset, markResetUsed } from "./store";

const GENERIC_MSG = "Si el correo existe, enviamos un código de recuperación.";

export async function requestReset(emailRaw: string): Promise<{ message: string }> {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { message: GENERIC_MSG };
  }

  const user = await getUserByEmail(email);
  if (!user || !user.activo) {
    return { message: GENERIC_MSG };
  }

  const code = generateCode();
  const codeHash = await hashCode(code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000);

  await saveResetCode(email, codeHash, expiresAt);
  await sendResetCodeEmail(email, code);

  return { message: GENERIC_MSG };
}

export async function verifyAndReset(
  emailRaw: string,
  code: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = emailRaw.trim().toLowerCase();

  if (!code || code.length !== 6) {
    return { ok: false, error: "Código inválido" };
  }
  if (!newPassword || newPassword.length < 8) {
    return { ok: false, error: "La contraseña debe tener al menos 8 caracteres" };
  }

  const record = await getLatestActiveReset(email);
  if (!record) {
    return { ok: false, error: "Código inválido o expirado" };
  }

  const valid = await verifyCode(code, record.code_hash);
  if (!valid) {
    return { ok: false, error: "Código inválido o expirado" };
  }

  const user = await getUserByEmail(email);
  if (!user) {
    return { ok: false, error: "Código inválido o expirado" };
  }

  await updateUser(user.id, { password: newPassword });
  await markResetUsed(email);

  return { ok: true };
}
