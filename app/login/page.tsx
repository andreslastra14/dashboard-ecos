"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";
import Image from "next/image";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, undefined);

  return (
    <div className="w-full max-w-sm mx-4">
      <div className="rounded-xl border bg-white shadow-lg p-8" style={{ borderColor: "#1e3a5f20" }}>
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <Image
            src="https://upload.wikimedia.org/wikipedia/commons/0/05/Logo_oficial_del_Ministerio_de_Educaci%C3%B3n_de_El_Salvador.png"
            alt="MINED El Salvador"
            width={64}
            height={64}
            className="rounded object-contain mb-3"
            style={{ background: "white", padding: "4px" }}
          />
          <h1 className="text-lg font-bold tracking-wide" style={{ color: "#1e3a5f" }}>
            ECOS
          </h1>
          <p className="text-xs text-gray-500">Monitoreo de Red Escolar</p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Usuario
            </label>
            <input
              id="email"
              name="email"
              type="text"
              required
              autoComplete="username"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="salvador"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
            style={{ backgroundColor: "#1e3a5f" }}
          >
            {pending ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Ministerio de Educación · El Salvador
        </p>
      </div>
    </div>
  );
}
