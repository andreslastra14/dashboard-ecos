import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { getDispositivos, getEscuelas } from "@/lib/queries";
import { getSession } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { getUserById } from "@/lib/usuarios";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function getDeviceList() {
  const [dispositivos, escuelas] = await Promise.all([
    getDispositivos(),
    getEscuelas(),
  ]);
  return dispositivos.map((d) => {
    const cleanId = (d.cpu_id || d.id).replace(/"/g, "").trim();
    const esc = escuelas[cleanId] ?? escuelas[d.cpu_id] ?? escuelas[d.id];
    return {
      id: cleanId,
      nombre: esc?.nombre_escuela || cleanId,
      online: d.online,
      codigo: d.codigo_mined || "",
    };
  });
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Refrescar rol desde DB en cada request — la cookie JWT puede tener un
  // role viejo si el cargo cambió en DB después del login (cookie dura 7d).
  // Si el usuario fue eliminado o desactivado, expulsar la sesión.
  const fresh = await getUserById(session.userId).catch(() => null);
  if (!fresh || !fresh.activo) redirect("/login");
  const role = fresh.role;
  const nombre = fresh.nombre || session.nombre;

  const devices = await getDeviceList();

  // For maestro role, only show their assigned device
  const filteredDevices = role === "maestro" && session.sondaAsignada
    ? devices.filter((d) => d.id === session.sondaAsignada)
    : devices;

  return (
    <>
      <Header
        userName={nombre}
        canGenerateReport={ROLES[role].canGenerateReports}
        userZona={role === "supervisor" ? session.zonaAsignada : null}
        devices={filteredDevices}
        sondaFija={session.sondaAsignada}
      />
      <div className="flex flex-1 overflow-hidden">
        <Suspense fallback={null}>
          <Sidebar devices={filteredDevices} userRole={role} sondaFija={session.sondaAsignada} />
        </Suspense>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">{children}</main>
      </div>
    </>
  );
}
