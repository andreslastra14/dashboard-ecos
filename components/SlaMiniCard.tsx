import type { LucideIcon } from "lucide-react";
import type { SlaResult } from "@/lib/sla";

interface SlaMiniCardProps {
  label: string;
  sla: SlaResult;
  icon: LucideIcon;
  fuente?: string;
}

function semaforoColor(sla: SlaResult): string {
  if (sla.cumple) return "#1e3a5f";
  const target = sla.target;
  const valor = sla.valor;
  const ambar =
    sla.targetOperator === ">="
      ? valor >= target * 0.95
      : valor <= target * 1.05;
  if (ambar) return "#d97706";
  return "#b91c1c";
}

function semaforoLabel(sla: SlaResult): string {
  if (sla.cumple) return "Cumple";
  const target = sla.target;
  const valor = sla.valor;
  const ambar =
    sla.targetOperator === ">="
      ? valor >= target * 0.95
      : valor <= target * 1.05;
  return ambar ? "En riesgo" : "Incumple";
}

function formatValor(sla: SlaResult): string {
  if (sla.unidad === "%") return `${sla.valor.toFixed(0)}%`;
  if (sla.unidad === "ms") return `${sla.valor.toFixed(0)} ms`;
  return `${sla.valor.toFixed(1)} h`;
}

function formatTarget(sla: SlaResult): string {
  const op = sla.targetOperator;
  if (sla.unidad === "%") return `${op} ${sla.target}%`;
  if (sla.unidad === "ms") return `${op} ${sla.target} ms`;
  return `${op} ${sla.target} h`;
}

export function SlaMiniCard({ label, sla, icon: Icon, fuente }: SlaMiniCardProps) {
  const color = semaforoColor(sla);
  const estado = semaforoLabel(sla);

  return (
    <div
      className="relative bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-3 overflow-hidden"
      style={{ borderColor: "#e2e8f0" }}
    >
      <div
        className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-[0.04] -translate-y-6 translate-x-6"
        style={{ backgroundColor: color }}
      />

      <div className="flex items-start justify-between gap-2">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "#64748b" }}
        >
          {label}
        </p>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}14` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <p className="text-3xl font-bold font-mono tracking-tight" style={{ color }}>
          {formatValor(sla)}
        </p>
        <span
          className="text-[10px] font-semibold uppercase tracking-wider rounded px-1.5 py-0.5"
          style={{ backgroundColor: `${color}14`, color }}
        >
          {estado}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 text-[11px]" style={{ color: "#94a3b8" }}>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          Target {formatTarget(sla)}
        </span>
        {fuente && <span className="text-right truncate ml-2">{fuente}</span>}
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-xl"
        style={{ backgroundColor: color, opacity: 0.7 }}
      />
    </div>
  );
}
