import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllUsers } from "@/lib/usuarios";
import { ROLES } from "@/lib/roles";
import { deleteUserAction } from "@/app/actions/usuarios";
import Link from "next/link";
import { Plus, Pencil, Trash2, Shield } from "lucide-react";

export const revalidate = 0;

export default async function AdminPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/");

  const users = await getAllUsers();

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

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100" style={{ backgroundColor: "#f8fafc" }}>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Rol</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Zona</th>
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
                      backgroundColor: u.role === "admin" ? "#1e3a5f15" : "#e0f2fe",
                      color: u.role === "admin" ? "#1e3a5f" : "#0369a1",
                    }}
                  >
                    {u.role === "admin" && <Shield className="w-3 h-3" />}
                    {ROLES[u.role]?.label ?? u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.zona_asignada || "Todas"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${u.activo ? "text-green-600" : "text-gray-400"}`}>
                    {u.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/${u.id}/editar`}
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
