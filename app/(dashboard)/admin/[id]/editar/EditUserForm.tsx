"use client";

import { useActionState } from "react";
import { updateUserAction, type UserFormState } from "@/app/actions/usuarios";
import Link from "next/link";
import { ArrowLeft } from "@carbon/icons-react";
import { useState } from "react";
import type { Role } from "@/lib/roles";

interface Props {
  user: {
    id: string;
    email: string;
    nombre: string;
    role: Role;
  };
}

export default function EditUserForm({ user }: Props) {
  const [state, formAction, pending] = useActionState<UserFormState, FormData>(updateUserAction, undefined);
  const [role, setRole] = useState(user.role);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="p-1.5 rounded-md hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} className="text-gray-500" />
        </Link>
        <h1 className="text-xl font-bold" style={{ color: "#1e3a5f" }}>Editar Usuario</h1>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm p-6">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={user.id} />

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Usuario (login)</label>
            <input id="email" name="email" type="text" required defaultValue={user.email}
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

          {state?.error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
          )}

          {state?.success && (
            <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">Usuario actualizado.</p>
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
