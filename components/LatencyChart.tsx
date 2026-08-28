"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface DataPoint {
  hora: string;
  youtube: number;
  mined: number;
  netflix: number;
}

export function LatencyChart({ data, dark }: { data: DataPoint[]; dark?: boolean }) {
  const grid = dark ? "#0062a8" : "#e2e8f0";
  const tick = dark ? "#64748b" : "#94a3b8";
  const tooltipBg = dark ? "#0d1f35" : "#fff";
  const tooltipBorder = dark ? "#0062a8" : "#e2e8f0";

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={grid} />
        <XAxis dataKey="hora" tick={{ fontSize: 10, fill: tick }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: tick }} tickLine={false} axisLine={false} unit=" ms" />
        <Tooltip
          contentStyle={{ borderRadius: "10px", fontSize: 11, backgroundColor: tooltipBg, borderColor: tooltipBorder }}
          formatter={(v, name) => [`${v} ms`, name]}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="youtube" stroke="#0062a8" strokeWidth={2} dot={false} name="YouTube" />
        <Line type="monotone" dataKey="mined" stroke="#0a78c8" strokeWidth={2} dot={false} name="Portal" />
        <Line type="monotone" dataKey="netflix" stroke="#64748b" strokeWidth={2} dot={false} name="Netflix" strokeDasharray="4 2" />
      </LineChart>
    </ResponsiveContainer>
  );
}
