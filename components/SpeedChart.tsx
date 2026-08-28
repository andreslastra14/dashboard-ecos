"use client";

import { useId } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface DataPoint {
  hora: string;
  descarga: number;
  subida: number;
}

export function SpeedChart({ data, dark }: { data: DataPoint[]; dark?: boolean }) {
  const id = useId();
  const gradDesc = `gradDesc-${id}`;
  const gradSub = `gradSub-${id}`;

  const grid = dark ? "#0062a8" : "#e2e8f0";
  const tick = dark ? "#64748b" : "#94a3b8";
  const tooltipBg = dark ? "#0d1f35" : "#fff";
  const tooltipBorder = dark ? "#0062a8" : "#e2e8f0";

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <defs>
          <linearGradient id={gradDesc} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0062a8" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#0062a8" stopOpacity={0} />
          </linearGradient>
          <linearGradient id={gradSub} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0a78c8" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#0a78c8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} />
        <XAxis dataKey="hora" tick={{ fontSize: 10, fill: tick }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: tick }} tickLine={false} axisLine={false} unit=" Mbps" />
        <Tooltip
          contentStyle={{ borderRadius: "10px", fontSize: 11, backgroundColor: tooltipBg, borderColor: tooltipBorder }}
          formatter={(v, name) => [`${v} Mbps`, name]}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area type="basis" dataKey="descarga" stroke="#0062a8" fill={`url(#${gradDesc})`} strokeWidth={2} name="Ethernet" />
        <Area type="basis" dataKey="subida" stroke="#0a78c8" fill={`url(#${gradSub})`} strokeWidth={2} name="WiFi" strokeDasharray="4 2" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
