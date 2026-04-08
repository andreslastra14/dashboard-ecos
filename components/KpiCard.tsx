import { type LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
  description?: string;
}

export function KpiCard({ label, value, icon: Icon, color, description }: KpiCardProps) {
  return (
    <div className="relative bg-white rounded-xl border border-slate-200 shadow-sm p-4 overflow-hidden flex flex-col gap-3">
      {/* Subtle background accent */}
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

      <p className="text-2xl font-bold font-mono tracking-tight" style={{ color }}>
        {value}
      </p>

      {description && (
        <p className="text-xs text-slate-400">{description}</p>
      )}

      {/* Bottom accent bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-xl"
        style={{ backgroundColor: color, opacity: 0.6 }}
      />
    </div>
  );
}
