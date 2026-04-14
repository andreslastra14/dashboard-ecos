"use client";

import { Cpu, MemoryStick, Thermometer, BatteryFull, Network, Wifi } from "lucide-react";

export interface SystemHealthData {
  avgCpu: number;
  avgRam: number;
  avgTemp: number;
  avgUpsNivel: number;
  avgEthLatencia: number;
  avgWifiLatencia: number;
  totalDevices: number;
  highCpu: number;
  highRam: number;
  highTemp: number;
  lowUps: number;
  highEthLatencia: number;
  highWifiLatencia: number;
}

function HealthBar({ label, value, unit, icon: Icon, max, threshold, alert, count, total }: {
  label: string;
  value: number;
  unit: string;
  icon: React.ElementType;
  max: number;
  threshold: number;
  alert: "above" | "below";
  count: number;
  total: number;
}) {
  const pct = Math.min((value / max) * 100, 100);
  const triggered = alert === "above" ? value > threshold : value < threshold && value > 0;
  const warning = alert === "above" ? value > threshold * 0.8 : value < threshold * 1.2 && value > 0;
  const color = triggered ? "#b91c1c" : warning ? "#d97706" : "#1e3a5f";

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
          <p className="text-xs font-mono font-bold" style={{ color }}>
            {value > 0 ? `${value.toFixed(1)} ${unit}` : "—"}
          </p>
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
      <HealthBar label="CPU Promedio" value={data.avgCpu} unit="%" icon={Cpu} max={100} threshold={80} alert="above" count={data.highCpu} total={data.totalDevices} />
      <HealthBar label="RAM Promedio" value={data.avgRam} unit="%" icon={MemoryStick} max={100} threshold={80} alert="above" count={data.highRam} total={data.totalDevices} />
      <HealthBar label="Temp. CPU Prom." value={data.avgTemp} unit="°C" icon={Thermometer} max={100} threshold={70} alert="above" count={data.highTemp} total={data.totalDevices} />
      <HealthBar label="Batería UPS Prom." value={data.avgUpsNivel} unit="%" icon={BatteryFull} max={100} threshold={30} alert="below" count={data.lowUps} total={data.totalDevices} />
      <HealthBar label="Latencia Ethernet" value={data.avgEthLatencia} unit="ms" icon={Network} max={500} threshold={200} alert="above" count={data.highEthLatencia} total={data.totalDevices} />
      <HealthBar label="Latencia WiFi" value={data.avgWifiLatencia} unit="ms" icon={Wifi} max={500} threshold={200} alert="above" count={data.highWifiLatencia} total={data.totalDevices} />
    </div>
  );
}
