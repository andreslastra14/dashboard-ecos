"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

const RANGES = [1, 3, 5, 8, 12] as const;

interface Props {
  current?: number;
  pathname: string;
  sonda?: string;
}

export function RangeSelector({ current = 12, pathname, sonda }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setRange(h: number) {
    if (h === current) return;
    const params = new URLSearchParams();
    if (sonda) params.set("sonda", sonda);
    params.set("horas", String(h));
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
      {RANGES.map((h) => {
        const active = current === h;
        return (
          <button
            key={h}
            type="button"
            onClick={() => setRange(h)}
            disabled={pending}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              active
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            } ${pending ? "opacity-60 cursor-wait" : ""}`}
          >
            {h}h
          </button>
        );
      })}
    </div>
  );
}
