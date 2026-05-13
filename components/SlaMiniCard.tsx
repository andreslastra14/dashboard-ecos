import type { LucideIcon } from "lucide-react";
import type { SlaResult } from "@/lib/sla";

interface SlaMiniCardProps {
  label: string;
  sla: SlaResult;
  icon: LucideIcon;
  fuente?: string;
}

function semaforoColor(sla: SlaResult): { fg: string; bg: string; bar: string } {
  if (sla.cumple) {
    return { fg: "#1e5f4a", bg: "#dcfce7", bar: "#22c55e" };
  }
  const target = sla.target;
  const valor = sla.valor;
  const ambar =
    sla.targetOperator === ">="
      ? valor >= target * 0.95
      : valor <= target * 1.05;
  if (ambar) {
    return { fg: "#92400e", bg: "#fef3c7", bar: "#d97706" };
  }
  return { fg: "#991b1b", bg: "#fee2e2", bar: "#b91c1c" };
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
  const c = semaforoColor(sla);
  return (
    <div
      className="relative bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-2 overflow-hidden"
      style={{ borderColor: "#e2e8f0" }}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          {label}
        </p>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: c.bg }}
        >
          <Icon className="w-4 h-4" style={{ color: c.fg }} />
        </div>
      </div>

      <p className="text-3xl font-bold font-mono tracking-tight" style={{ color: c.fg }}>
        {formatValor(sla)}
      </p>

      <div className="flex items-center gap-2">
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ backgroundColor: c.bar }}
        />
        <span className="text-[11px] text-slate-500">
          Target {formatTarget(sla)}
        </span>
      </div>

      {fuente && (
        <p className="text-[10px] text-slate-400 mt-1">{fuente}</p>
      )}

      <div
        className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-xl"
        style={{ backgroundColor: c.bar, opacity: 0.7 }}
      />
    </div>
  );
}
