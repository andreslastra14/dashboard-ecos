"use client";

import { Cpu, HardDrive, Thermometer, MemoryStick } from "lucide-react";

export interface SystemHealthData {
  avgCpu: number;
  avgRam: number;
  avgDisk: number;
  avgTemp: number;
  totalDevices: number;
  highCpu: number;   // devices with cpu > 80%
  highRam: number;    // devices with ram > 80%
  highDisk: number;   // devices with disk > 80%
  highTemp: number;   // devices with temp > 70C
}

function HealthBar({ label, value, icon: Icon, threshold, count, total }: {
  label: string;
  value: number;
  icon: React.ElementType;
  threshold: number;
  count: number;
  total: number;
}) {
  const pct = Math.min(value, 100);
  const color = value > threshold ? "#b91c1c" : value > threshold * 0.8 ? "#d97706" : "#1e3a5f";

  return (
    <div className="flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}14` }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-slate-600">{label}</p>
          <p className="text-xs font-mono font-bold" style={{ color }}>{value}%</p>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
        {count > 0 && (
          <p className="text-[10px] text-slate-400 mt-0.5">{count}/{total} dispositivos en alerta</p>
        )}
      </div>
    </div>
  );
}

export function SystemHealthSummary({ data }: { data: SystemHealthData }) {
  return (
    <div className="flex flex-col gap-4">
      <HealthBar label="CPU Promedio" value={data.avgCpu} icon={Cpu} threshold={80} count={data.highCpu} total={data.totalDevices} />
      <HealthBar label="RAM Promedio" value={data.avgRam} icon={MemoryStick} threshold={80} count={data.highRam} total={data.totalDevices} />
      <HealthBar label="Disco Promedio" value={data.avgDisk} icon={HardDrive} threshold={80} count={data.highDisk} total={data.totalDevices} />
      <HealthBar label="Temp. CPU Prom." value={data.avgTemp} icon={Thermometer} threshold={70} count={data.highTemp} total={data.totalDevices} />
    </div>
  );
}
