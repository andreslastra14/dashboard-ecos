import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { getDispositivos, getEscuelas } from "@/lib/queries";
import { getSession } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
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
    return { id: cleanId, nombre: esc?.nombre_escuela || cleanId, online: d.online };
  });
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const devices = await getDeviceList();

  // For maestro role, only show their assigned device
  const filteredDevices = session.role === "maestro" && session.sondaAsignada
    ? devices.filter((d) => d.id === session.sondaAsignada)
    : devices;

  return (
    <>
      <Header
        userName={session.nombre}
        canGenerateReport={ROLES[session.role].canGenerateReports}
        userZona={session.role === "supervisor" ? session.zonaAsignada : null}
        devices={filteredDevices}
        sondaFija={session.sondaAsignada}
      />
      <div className="flex flex-1 overflow-hidden">
        <Suspense fallback={null}>
          <Sidebar devices={filteredDevices} userRole={session.role} sondaFija={session.sondaAsignada} />
        </Suspense>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">{children}</main>
      </div>
    </>
  );
}
