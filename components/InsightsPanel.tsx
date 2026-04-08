"use client";

import {
  TrendingDown,
  TrendingUp,
  Clock,
  AlertTriangle,
  Globe,
  BarChart3,
  ShieldOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface InsightsData {
  filtroBypassCount: number;
  filtroTotalCount: number;
  peorSonda: { serie: string; dispositivo: string; uptime: number } | null;
  mejorSonda: { serie: string; dispositivo: string; uptime: number } | null;
  horasPico: string;
  sondasEnRiesgo: number;
  promedioFallasPorDia: number;
  minedInaccesible: number;
}

interface InsightItem {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  color: string; // Same corporate palette as KpiCard
}

// Corporate palette — identical to KPI cards
const BLUE_PRIMARY = "#1e3a5f";
const BLUE_SECONDARY = "#2e6da4";
const BLUE_TERTIARY = "#3b82a0";
const BLUE_QUATERNARY = "#4a7c8e";
const GREEN_OK = "#1e5f4a";
const RED_CRITICAL = "#b91c1c";

export function InsightsPanel({ data }: { data: InsightsData }) {
  const items: InsightItem[] = [
    {
      icon: ShieldOff,
      label: "Filtro de Contenido",
      value: data.filtroBypassCount > 0 ? `${data.filtroBypassCount} sin filtro` : "Protegidos",
      detail: `${data.filtroTotalCount - data.filtroBypassCount}/${data.filtroTotalCount} con filtro activo`,
      color: data.filtroBypassCount > 0 ? RED_CRITICAL : GREEN_OK,
    },
    {
      icon: Globe,
      label: "Portal MINED",
      value: data.minedInaccesible > 0 ? `${data.minedInaccesible} sin acceso` : "Conectados",
      detail: "Conectividad al portal educativo",
      color: data.minedInaccesible > 0 ? BLUE_SECONDARY : GREEN_OK,
    },
    {
      icon: AlertTriangle,
      label: "Sondas en Riesgo",
      value: `${data.sondasEnRiesgo}`,
      detail: "Lat. >150ms o desc. <5Mbps",
      color: data.sondasEnRiesgo > 0 ? BLUE_SECONDARY : GREEN_OK,
    },
    {
      icon: Clock,
      label: "Hora Pico Fallas",
      value: data.horasPico,
      detail: "Mayor concentración de fallas",
      color: BLUE_TERTIARY,
    },
    {
      icon: BarChart3,
      label: "Fallas/Día",
      value: String(data.promedioFallasPorDia),
      detail: "Promedio diario de fallas",
      color: data.promedioFallasPorDia > 10 ? RED_CRITICAL : BLUE_QUATERNARY,
    },
    {
      icon: TrendingDown,
      label: "Peor Sonda",
      value: data.peorSonda ? `${data.peorSonda.uptime}%` : "—",
      detail: data.peorSonda?.dispositivo ?? "Sin datos",
      color: (data.peorSonda?.uptime ?? 100) < 90 ? RED_CRITICAL : BLUE_PRIMARY,
    },
    {
      icon: TrendingUp,
      label: "Mejor Sonda",
      value: data.mejorSonda ? `${data.mejorSonda.uptime}%` : "—",
      detail: data.mejorSonda?.dispositivo ?? "Sin datos",
      color: GREEN_OK,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
      {items.map(({ icon: Icon, label, value, detail, color }) => (
        <div
          key={label}
          className="relative bg-white rounded-xl border border-slate-200 shadow-sm p-4 overflow-hidden flex flex-col gap-3"
        >
          {/* Subtle background accent — same as KpiCard */}
          <div
            className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.04] -translate-y-6 translate-x-6"
            style={{ backgroundColor: color }}
          />

          <div className="flex items-start justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${color}14` }}
            >
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
          </div>

          <p className="text-xl font-bold font-mono tracking-tight" style={{ color }}>
            {value}
          </p>

          <p className="text-xs text-slate-400">{detail}</p>

          {/* Bottom accent bar — same as KpiCard */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-xl"
            style={{ backgroundColor: color, opacity: 0.6 }}
          />
        </div>
      ))}
    </div>
  );
}
