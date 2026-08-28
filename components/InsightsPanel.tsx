"use client";

import {
  ArrowDown as TrendingDown,
  ArrowUp as TrendingUp,
  WarningAlt as AlertTriangle,
  Earth as Globe,
  Security as ShieldOff,
  BatteryLow as BatteryWarning,
  Flash as Zap,
} from "@carbon/icons-react";
import type { CarbonIconType } from "@carbon/icons-react";

export interface InsightsData {
  filtroBypassCount: number;
  filtroTotalCount: number;
  minedInaccesible: number;
  minedTotalCount: number;
  sondasEnRiesgo: number;
  upsProblemas: number;
  peorDispositivo: { cpuId: string; nombre: string; uptime: number } | null;
  mejorDispositivo: { cpuId: string; nombre: string; uptime: number } | null;
}

interface InsightItem {
  icon: CarbonIconType;
  label: string;
  value: string;
  detail: string;
  color: string;
}

const BLUE_PRIMARY = "#0062a8";
const BLUE_SECONDARY = "#0a78c8";
const BLUE_TERTIARY = "#3b82a0";
const GREEN_OK = "#1e5f4a";
const RED_CRITICAL = "#b91c1c";

export function InsightsPanel({ data }: { data: InsightsData }) {
  const items: InsightItem[] = [
    {
      icon: ShieldOff,
      label: "Filtro Contenido",
      value: data.filtroBypassCount > 0 ? `${data.filtroBypassCount} sin filtro` : "Protegidos",
      detail: `${data.filtroTotalCount - data.filtroBypassCount}/${data.filtroTotalCount} con filtro activo`,
      color: data.filtroBypassCount > 0 ? RED_CRITICAL : GREEN_OK,
    },
    {
      icon: Globe,
      label: "Portal Web",
      value: data.minedInaccesible > 0 ? `${data.minedInaccesible} sin acceso` : "Conectados",
      detail: `${data.minedTotalCount - data.minedInaccesible}/${data.minedTotalCount} con acceso`,
      color: data.minedInaccesible > 0 ? BLUE_SECONDARY : GREEN_OK,
    },
    {
      icon: AlertTriangle,
      label: "Sondas en Riesgo",
      value: `${data.sondasEnRiesgo}`,
      detail: "Desc. <5Mbps o desconectadas",
      color: data.sondasEnRiesgo > 0 ? BLUE_SECONDARY : GREEN_OK,
    },
    {
      icon: BatteryWarning,
      label: "UPS con Problemas",
      value: `${data.upsProblemas}`,
      detail: "Estado anormal de UPS",
      color: data.upsProblemas > 0 ? RED_CRITICAL : GREEN_OK,
    },
    {
      icon: Zap,
      label: "Filtro Bypass",
      value: data.filtroBypassCount > 0 ? `${data.filtroBypassCount}` : "0",
      detail: "Adultos accesible (filtro falla)",
      color: data.filtroBypassCount > 0 ? RED_CRITICAL : GREEN_OK,
    },
    {
      icon: TrendingDown,
      label: "Peor Dispositivo",
      value: data.peorDispositivo ? `${data.peorDispositivo.uptime}%` : "--",
      detail: data.peorDispositivo?.nombre ?? "Sin datos",
      color: (data.peorDispositivo?.uptime ?? 100) < 90 ? RED_CRITICAL : BLUE_PRIMARY,
    },
    {
      icon: TrendingUp,
      label: "Mejor Dispositivo",
      value: data.mejorDispositivo ? `${data.mejorDispositivo.uptime}%` : "--",
      detail: data.mejorDispositivo?.nombre ?? "Sin datos",
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
              <Icon size={16} style={{ color }} />
            </div>
          </div>

          <p className="text-xl font-bold font-mono tracking-tight" style={{ color }}>
            {value}
          </p>

          <p className="text-xs text-slate-400">{detail}</p>
        </div>
      ))}
    </div>
  );
}
