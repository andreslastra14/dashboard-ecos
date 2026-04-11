import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserById } from "@/lib/usuarios";
import EditUserForm from "./EditUserForm";

export const revalidate = 0;

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/");

  const { id } = await params;
  const user = await getUserById(id);
  if (!user) redirect("/admin");

  return (
    <EditUserForm
      user={{
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        role: user.role,
        zona_asignada: user.zona_asignada,
        sonda_asignada: user.sonda_asignada,
        activo: user.activo,
      }}
    />
  );
}
