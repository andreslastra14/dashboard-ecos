"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { changePassword, type ChangePasswordState } from "@/app/actions/auth";

/**
 * Form de cambio de contraseña (nueva + confirmar). Reutilizado por:
 * - /cambiar-password (primer login obligatorio) → pasar redirectTo="/"
 * - /configuracion (cambio voluntario) → sin redirectTo, muestra mensaje de éxito
 */
export function ChangePasswordForm({
  redirectTo,
  ctaLabel = "Guardar contraseña",
}: {
  redirectTo?: string;
  ctaLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<ChangePasswordState, FormData>(
    changePassword,
    undefined,
  );
  const router = useRouter();
  const done = Boolean(state?.ok && !redirectTo);

  useEffect(() => {
    if (state?.ok && redirectTo) {
      router.push(redirectTo);
      router.refresh();
    }
  }, [state, redirectTo, router]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Nueva contraseña</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Confirmar contraseña</label>
        <input
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Repite la contraseña"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{state.error}</p>
      )}
      {done && (
        <p className="text-sm text-green-700 bg-green-50 rounded-md px-3 py-2">
          Contraseña actualizada correctamente.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60"
        style={{ backgroundColor: "#1e3a5f" }}
      >
        {pending ? "Guardando..." : ctaLabel}
      </button>
    </form>
  );
}
