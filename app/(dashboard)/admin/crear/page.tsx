"use client";

import { useActionState } from "react";
import { createUserAction, type UserFormState } from "@/app/actions/usuarios";
import { DEPARTAMENTOS } from "@/lib/geo";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";

interface DeviceOption {
  id: string;
  nombre: string;
}

export default function CrearUsuarioPage() {
  const [state, formAction, pending] = useActionState<UserFormState, FormData>(createUserAction, undefined);
  const [role, setRole] = useState("operador");
  const [devices, setDevices] = useState<DeviceOption[]>([]);

  useEffect(() => {
    if (role === "maestro") {
      fetch("/api/dispositivos/lista")
        .then((r) => r.json())
        .then((d) => setDevices(d))
        .catch(() => setDevices([]));
    }
  }, [role]);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="p-1.5 rounded-md hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <h1 className="text-xl font-bold" style={{ color: "#1e3a5f" }}>Crear Usuario</h1>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm p-6">
        <form action={formAction} className="flex flex-col gap-4">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input id="nombre" name="nombre" required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
            <input id="email" name="email" type="email" required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input id="password" name="password" type="password" required minLength={6}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select id="role" name="role" value={role} onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="admin">Administrador</option>
              <option value="supervisor">Supervisor</option>
              <option value="operador">Operador</option>
              <option value="tecnico">Técnico</option>
              <option value="maestro">Maestro</option>
            </select>
          </div>

          {role === "supervisor" && (
            <div>
              <label htmlFor="zona_asignada" className="block text-sm font-medium text-gray-700 mb-1">Zona Asignada</label>
              <select id="zona_asignada" name="zona_asignada" required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Seleccionar departamento...</option>
                {DEPARTAMENTOS.map((d) => (
                  <option key={d.nombre} value={d.nombre}>{d.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {role === "maestro" && (
            <div>
              <label htmlFor="sonda_asignada" className="block text-sm font-medium text-gray-700 mb-1">Escuela / Sonda Asignada</label>
              <select id="sonda_asignada" name="sonda_asignada" required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">Seleccionar escuela...</option>
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>{d.nombre} ({d.id})</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">El maestro solo podrá ver los datos de esta sonda.</p>
            </div>
          )}

          {state?.error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
          )}

          <button type="submit" disabled={pending}
            className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
            style={{ backgroundColor: "#1e3a5f" }}>
            {pending ? "Creando..." : "Crear Usuario"}
          </button>
        </form>
      </div>
    </div>
  );
}
