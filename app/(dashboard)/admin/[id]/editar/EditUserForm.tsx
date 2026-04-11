"use client";

import { useActionState } from "react";
import { updateUserAction, type UserFormState } from "@/app/actions/usuarios";
import { DEPARTAMENTOS } from "@/lib/geo";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import type { Role } from "@/lib/roles";

interface Props {
  user: {
    id: string;
    email: string;
    nombre: string;
    role: Role;
    zona_asignada: string | null;
    activo: boolean;
  };
}

export default function EditUserForm({ user }: Props) {
  const [state, formAction, pending] = useActionState<UserFormState, FormData>(updateUserAction, undefined);
  const [role, setRole] = useState(user.role);
  const [activo, setActivo] = useState(user.activo);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="p-1.5 rounded-md hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <h1 className="text-xl font-bold" style={{ color: "#1e3a5f" }}>Editar Usuario</h1>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm p-6">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={user.id} />
          <input type="hidden" name="activo" value={String(activo)} />

          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input id="nombre" name="nombre" required defaultValue={user.nombre}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
            <input id="email" name="email" type="email" required defaultValue={user.email}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Nueva contraseña <span className="text-gray-400 font-normal">(dejar vacío para no cambiar)</span>
            </label>
            <input id="password" name="password" type="password" minLength={6}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select id="role" name="role" value={role} onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="admin">Administrador</option>
              <option value="supervisor">Supervisor</option>
              <option value="operador">Operador</option>
              <option value="tecnico">Técnico</option>
            </select>
          </div>

          {role === "supervisor" && (
            <div>
              <label htmlFor="zona_asignada" className="block text-sm font-medium text-gray-700 mb-1">Zona Asignada</label>
              <select id="zona_asignada" name="zona_asignada" required defaultValue={user.zona_asignada || ""}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Seleccionar departamento...</option>
                {DEPARTAMENTOS.map((d) => (
                  <option key={d.nombre} value={d.nombre}>{d.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-3">
            <label htmlFor="activo-toggle" className="text-sm font-medium text-gray-700">Estado</label>
            <button
              type="button"
              id="activo-toggle"
              onClick={() => setActivo(!activo)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${activo ? "bg-green-500" : "bg-gray-300"}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${activo ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <span className={`text-sm ${activo ? "text-green-600" : "text-gray-400"}`}>
              {activo ? "Activo" : "Inactivo"}
            </span>
          </div>

          {state?.error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
          )}

          <button type="submit" disabled={pending}
            className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
            style={{ backgroundColor: "#1e3a5f" }}>
            {pending ? "Guardando..." : "Guardar Cambios"}
          </button>
        </form>
      </div>
    </div>
  );
}
