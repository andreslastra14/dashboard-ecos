import "server-only";
import { Resend } from "resend";

const FROM = process.env.RESEND_FROM || "onboarding@resend.dev";
const APP_NAME = process.env.APP_NAME || "Dashboard";

let resend: Resend | undefined;
function getClient(): Resend {
  if (resend) return resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  resend = new Resend(key);
  return resend;
}

export async function sendResetCodeEmail(to: string, code: string): Promise<void> {
  const client = getClient();
  const { error } = await client.emails.send({
    from: `${APP_NAME} <${FROM}>`,
    to,
    subject: `Código de recuperación de contraseña`,
    html: renderHtml(code),
    text: `Tu código de recuperación es: ${code}\n\nExpira en 15 minutos. Si no solicitaste este código, ignora este mensaje.`,
  });
  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

function renderHtml(code: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f5f7fa;margin:0;padding:40px 16px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
    <h1 style="color:#1e3a5f;margin:0 0 16px;font-size:20px;">Recuperación de contraseña</h1>
    <p style="color:#475569;margin:0 0 24px;font-size:14px;line-height:1.5;">
      Usa el siguiente código para restablecer tu contraseña. Expira en 15 minutos.
    </p>
    <div style="background:#f1f5f9;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px;">
      <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#1e3a5f;">${code}</div>
    </div>
    <p style="color:#94a3b8;margin:0;font-size:12px;line-height:1.5;">
      Si no solicitaste este código, ignora este mensaje. Nadie sabrá que recibiste el correo.
    </p>
  </div>
</body>
</html>`;
}
