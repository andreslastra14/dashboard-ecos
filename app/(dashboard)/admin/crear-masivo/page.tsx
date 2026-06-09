"use client";

import { useActionState, useState } from "react";
import { createUsersBulkAction, type BulkState } from "@/app/actions/usuarios";
import Link from "next/link";
import { ArrowLeft } from "@carbon/icons-react";

export default function CrearMasivoPage() {
  const [state, formAction, pending] = useActionState<BulkState, FormData>(createUsersBulkAction, undefined);
  const [role, setRole] = useState("operador");

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="p-1.5 rounded-md hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} className="text-gray-500" />
        </Link>
        <h1 className="text-xl font-bold" style={{ color: "#1e3a5f" }}>Alta masiva de usuarios</h1>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm p-6">
        <form action={formAction} className="flex flex-col gap-4">
          <div>
            <label htmlFor="emails" className="block text-sm font-medium text-gray-700 mb-1">Correos</label>
            <textarea id="emails" name="emails" required rows={6}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={"uno por línea o separados por coma:\nmaria@escuela.sv\njose@escuela.sv"} />
            <p className="text-xs text-gray-400 mt-1">Uno por línea, o separados por coma/espacio.</p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Contraseña genérica (para todos)</label>
            <input id="password" name="password" type="text" required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ej: Ecos2026" />
            <p className="text-xs text-gray-400 mt-1">Cada usuario deberá cambiarla en su primer ingreso.</p>
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Rol (para todo el lote)</label>
            <select id="role" name="role" value={role} onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="admin">Administrador</option>
              <option value="supervisor">Supervisor</option>
              <option value="operador">Operador</option>
              <option value="tecnico">Técnico</option>
            </select>
          </div>

          {state?.error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
          )}

          {state?.resumen && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-3 text-sm space-y-1">
              <p className="text-green-700 font-medium">✓ {state.resumen.creados} usuario(s) creado(s).</p>
              {state.resumen.omitidos.length > 0 && (
                <p className="text-amber-600">
                  Omitidos (ya existían): {state.resumen.omitidos.join(", ")}
                </p>
              )}
              {state.resumen.errores.length > 0 && (
                <div className="text-red-600">
                  Errores:
                  <ul className="list-disc list-inside">
                    {state.resumen.errores.map((e) => (
                      <li key={e.email}>{e.email}: {e.msg}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <button type="submit" disabled={pending}
            className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
            style={{ backgroundColor: "#1e3a5f" }}>
            {pending ? "Creando..." : "Crear usuarios"}
          </button>
        </form>
      </div>
    </div>
  );
}
