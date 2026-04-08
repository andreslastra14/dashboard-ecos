import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dashboard de Monitoreo de Red — MINED",
  description: "Sistema de monitoreo de conectividad escolar — Ministerio de Educación de El Salvador",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="h-full flex flex-col antialiased bg-gray-50">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          {/* pb-16 en móvil para que el bottom nav no tape el contenido */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
