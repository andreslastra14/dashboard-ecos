"use client";

export interface UptimeData {
  cpuId: string;
  nombre: string;
  uptime: number;
}

function getColor(uptime: number): string {
  if (uptime >= 95) return "#0062a8";
  if (uptime >= 90) return "#0a78c8";
  return "#b91c1c";
}

function UptimeRing({ value, color, size = 48 }: { value: number; color: string; size?: number }) {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize={11}
        fontWeight={700}
        fontFamily="ui-monospace, monospace"
      >
        {value}%
      </text>
    </svg>
  );
}

export function UptimeChart({ data }: { data: UptimeData[] }) {
  const sorted = [...data].sort((a, b) => a.uptime - b.uptime);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {sorted.map((item) => {
        const color = getColor(item.uptime);
        return (
          <div
            key={item.cpuId}
            className="relative bg-white rounded-xl border border-slate-200 shadow-sm p-3 flex items-center gap-3 overflow-hidden"
          >
            <UptimeRing value={item.uptime} color={color} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-700 truncate">{item.nombre}</p>
              <p className="text-[10px] text-slate-400 font-mono truncate">{item.cpuId}</p>
            </div>
            <div
              className="absolute bottom-0 left-0 right-0 h-[2px]"
              style={{ backgroundColor: color, opacity: 0.5 }}
            />
          </div>
        );
      })}
    </div>
  );
}
