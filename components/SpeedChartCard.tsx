"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

export interface SpeedPoint {
  ts: number;
  descarga: number;
  subida: number;
}

interface Props {
  data: SpeedPoint[];
  title: string;
  initialHours?: number;
}

const RANGES = [1, 3, 5, 8, 12] as const;

function formatHour(ts: number) {
  return new Date(ts).toLocaleTimeString("es-SV", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/El_Salvador",
  });
}

function bucketize(points: SpeedPoint[], bucketMs: number): SpeedPoint[] {
  if (!points.length) return [];
  const buckets = new Map<number, { d: number[]; s: number[] }>();
  for (const p of points) {
    const key = Math.floor(p.ts / bucketMs) * bucketMs;
    const b = buckets.get(key) ?? { d: [], s: [] };
    if (p.descarga > 0) b.d.push(p.descarga);
    if (p.subida > 0) b.s.push(p.subida);
    buckets.set(key, b);
  }
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  return [...buckets.entries()]
    .map(([ts, b]) => ({ ts, descarga: mean(b.d), subida: mean(b.s) }))
    .sort((a, b) => a.ts - b.ts);
}

export function SpeedChartCard({ data, title, initialHours = 12 }: Props) {
  const [horas, setHoras] = useState(initialHours);
  const [domain, setDomain] = useState<[number, number] | null>(null);
  const rafRef = useRef<number | null>(null);

  const id = useId();
  const gradDesc = `gradDesc-${id}`;
  const gradSub = `gradSub-${id}`;

  // Bucket to 3-minute averages => 240 points max in 12h; smooths jitter and cuts lag
  const bucketed = useMemo(() => bucketize(data, 3 * 60 * 1000), [data]);

  const now = bucketed.length ? bucketed[bucketed.length - 1].ts : Date.now();

  useEffect(() => {
    const target: [number, number] = [now - horas * 60 * 60 * 1000, now];
    if (!domain) {
      setDomain(target);
      return;
    }
    // Tween domain for a smooth zoom-in/out feel
    const start = domain;
    const duration = 600;
    const startTime = performance.now();
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (ts: number) => {
      const t = Math.min(1, (ts - startTime) / duration);
      const e = easeOut(t);
      setDomain([
        start[0] + (target[0] - start[0]) * e,
        start[1] + (target[1] - start[1]) * e,
      ]);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horas]);

  const activeDomain = domain ?? [now - horas * 60 * 60 * 1000, now];

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          {title} ({horas}h)
        </p>
        <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {RANGES.map((h) => {
            const active = horas === h;
            return (
              <button
                key={h}
                type="button"
                onClick={() => setHoras(h)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  active
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {h}h
              </button>
            );
          })}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={bucketed} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <defs>
            <linearGradient id={gradDesc} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0062a8" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#0062a8" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={gradSub} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0a78c8" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#0a78c8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={activeDomain}
            allowDataOverflow
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatHour}
            minTickGap={40}
          />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} unit=" Mbps" />
          <Tooltip
            contentStyle={{ borderRadius: "10px", fontSize: 11, backgroundColor: "#fff", borderColor: "#e2e8f0" }}
            labelFormatter={(v) => formatHour(Number(v))}
            formatter={(v, name) => [`${Number(v).toFixed(1)} Mbps`, name]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="plainline" />
          <Area
            type="monotone"
            dataKey="descarga"
            stroke="#0062a8"
            fill={`url(#${gradDesc})`}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            name="Ethernet"
            isAnimationActive={false}
            connectNulls
            dot={false}
            activeDot={{ r: 3 }}
          />
          <Area
            type="monotone"
            dataKey="subida"
            stroke="#0a78c8"
            fill={`url(#${gradSub})`}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 2"
            name="WiFi"
            isAnimationActive={false}
            connectNulls
            dot={false}
            activeDot={{ r: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
