import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { getDispositivos, getEscuelas } from "@/lib/queries";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ECOS — Monitoreo de Red Escolar",
  description: "ECOS — Sistema de monitoreo de conectividad escolar — Ministerio de Educación de El Salvador",
};

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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const devices = await getDeviceList();

  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="h-full flex flex-col antialiased bg-gray-50">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Suspense fallback={null}>
            <Sidebar devices={devices} />
          </Suspense>
          <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
