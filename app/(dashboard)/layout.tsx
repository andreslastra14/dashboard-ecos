import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { getDispositivos, getEscuelas } from "@/lib/queries";
import { getSession } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { getUserById } from "@/lib/usuarios";
import { cleanDeviceId, getDepartamentoForDevice, getEscuelaForDevice, getZonaForDevice } from "@/lib/dashboard-filters";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function getDeviceList() {
  const [dispositivos, escuelas] = await Promise.all([
    getDispositivos(),
    getEscuelas(),
  ]);
  return dispositivos.map((d) => {
    const cleanId = cleanDeviceId(d);
    const esc = getEscuelaForDevice(d, escuelas);
    return {
      id: cleanId,
      nombre: esc?.nombre_escuela || cleanId,
      online: d.online,
      codigo: d.codigo_mined || "",
      departamento: getDepartamentoForDevice(d, escuelas),
      zona: getZonaForDevice(d, escuelas),
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
  // En paralelo se arma la lista de sondas para no sumar latencias antes de pintar.
  const [fresh, devices] = await Promise.all([
    getUserById(session.userId).catch(() => null),
    getDeviceList(),
  ]);
  if (!fresh || !fresh.activo) redirect("/login");
  // Cambio de contraseña obligatorio: si el usuario aún tiene la contraseña
  // genérica (requiere_cambio_pwd), bloquea el dashboard hasta que la cambie.
  if (fresh.requiere_cambio_pwd) redirect("/cambiar-password");
  const role = fresh.role;
  const nombre = fresh.nombre || session.nombre;

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
