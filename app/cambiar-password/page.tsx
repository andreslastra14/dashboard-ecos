import { redirect } from "next/navigation";
import Image from "next/image";
import { getSession } from "@/lib/auth";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

// Pantalla de cambio de contraseña OBLIGATORIO en el primer login.
// Vive FUERA del grupo (dashboard) a propósito: así el layout del dashboard
// (que redirige aquí cuando requiere_cambio_pwd) no la envuelve ni causa loop.
export default async function CambiarPasswordPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#04263e" }}>
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6">
        <div className="flex flex-col items-center text-center mb-5">
          <Image src="/brand/rapidnet-logo-256.png" alt="RapidNet" width={150} height={38} className="rounded object-contain mb-3" />
          <h1 className="text-lg font-bold text-gray-900">Cambia tu contraseña</h1>
          <p className="text-sm text-gray-500 mt-1">
            Por seguridad, define una nueva contraseña para continuar.
          </p>
        </div>
        <ChangePasswordForm redirectTo="/" ctaLabel="Cambiar y continuar" />
      </div>
    </div>
  );
}
