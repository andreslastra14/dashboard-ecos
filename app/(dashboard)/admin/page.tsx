import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllUsers } from "@/lib/usuarios";
import { ROLES } from "@/lib/roles";
import { deleteUserAction } from "@/app/actions/usuarios";
import Link from "next/link";
import { Plus, Pencil, Trash2, Shield, Check, X, GraduationCap } from "lucide-react";

export const revalidate = 0;

export default async function AdminPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/");

  const users = await getAllUsers();

  const permLabels = [
    { key: "canManageUsers" as const, label: "Gestionar usuarios" },
    { key: "canViewAllZones" as const, label: "Ver todas las zonas" },
    { key: "canManageTickets" as const, label: "Gestionar tickets" },
    { key: "canGenerateReports" as const, label: "Generar reportes PDF" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#1e3a5f" }}>Gestión de Usuarios</h1>
          <p className="text-sm text-gray-500">{users.length} usuarios registrados</p>
        </div>
        <Link
          href="/admin/crear"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: "#1e3a5f" }}
        >
          <Plus className="w-4 h-4" /> Crear Usuario
        </Link>
      </div>

      {/* Panel de roles y habilidades */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100" style={{ backgroundColor: "#f8fafc" }}>
          <h2 className="text-sm font-semibold text-gray-700">Roles y Habilidades</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-36">Rol</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Alcance</th>
                {permLabels.map((p) => (
                  <th key={p.key} className="text-center px-3 py-2.5 font-medium text-gray-600 text-xs">{p.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Object.entries(ROLES) as [string, typeof ROLES[keyof typeof ROLES]][]).map(([key, role]) => (
                <tr key={key} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {key === "maestro" && <GraduationCap className="w-4 h-4 text-amber-600" />}
                      {key === "admin" && <Shield className="w-4 h-4" style={{ color: "#1e3a5f" }} />}
                      <div>
                        <p className="font-medium text-gray-900">{role.label}</p>
                        <p className="text-[11px] text-gray-400 leading-tight">{role.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{role.scopeLabel}</td>
                  {permLabels.map((p) => (
                    <td key={p.key} className="text-center px-3 py-2.5">
                      {role[p.key] ? (
                        <Check className="w-4 h-4 text-green-500 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-gray-300 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100" style={{ backgroundColor: "#f8fafc" }}>
          <h2 className="text-sm font-semibold text-gray-700">Usuarios</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100" style={{ backgroundColor: "#f8fafc" }}>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Rol</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Asignación</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-900">{u.nombre}</td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: u.role === "admin" ? "#1e3a5f15" : u.role === "maestro" ? "#fef3c7" : "#e0f2fe",
                      color: u.role === "admin" ? "#1e3a5f" : u.role === "maestro" ? "#92400e" : "#0369a1",
                    }}
                  >
                    {u.role === "admin" && <Shield className="w-3 h-3" />}
                    {u.role === "maestro" && <GraduationCap className="w-3 h-3" />}
                    {ROLES[u.role]?.label ?? u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {u.role === "maestro" && u.sonda_asignada
                    ? `Sonda: ${u.sonda_asignada}`
                    : u.zona_asignada || "Todas las zonas"}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${u.activo ? "text-green-600" : "text-gray-400"}`}>
                    {u.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/${encodeURIComponent(u.id)}/editar`}
                      className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                    {u.id !== session.userId && (
                      <form action={deleteUserAction}>
                        <input type="hidden" name="id" value={u.id} />
                        <button
                          type="submit"
                          className="p-1.5 rounded-md hover:bg-red-50 transition-colors text-gray-400 hover:text-red-600"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
