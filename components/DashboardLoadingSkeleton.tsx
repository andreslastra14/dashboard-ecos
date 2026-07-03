import type { CSSProperties, ReactNode } from "react";

function Shimmer({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden="true" className={`skeleton-shimmer ${className ?? ""}`} style={style} />;
}

function CardSkeleton({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ${className}`} style={{ borderColor: "#e2e8f0" }}>
      {children}
    </div>
  );
}

function KpiSkeleton() {
  return (
    <CardSkeleton className="min-h-[92px]">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-3 flex-1">
          <Shimmer className="h-3 w-20 rounded-full" />
          <Shimmer className="h-7 w-24 rounded-md" />
        </div>
        <Shimmer className="h-9 w-9 rounded-lg" />
      </div>
    </CardSkeleton>
  );
}

function ChartSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <CardSkeleton className={tall ? "min-h-[420px]" : "min-h-[285px]"}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <Shimmer className="h-3 w-44 rounded-full" />
        <Shimmer className="h-7 w-24 rounded-md" />
      </div>
      <div className="flex h-52 items-end gap-2">
        {[44, 68, 54, 78, 48, 84, 62, 72, 50, 88, 58, 74, 46, 80, 64, 70].map((height, index) => (
          <Shimmer
            key={`${height}-${index}`}
            className="flex-1 rounded-t-md"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <div className="mt-5 grid grid-cols-4 gap-3">
        <Shimmer className="h-2 rounded-full" />
        <Shimmer className="h-2 rounded-full" />
        <Shimmer className="h-2 rounded-full" />
        <Shimmer className="h-2 rounded-full" />
      </div>
    </CardSkeleton>
  );
}

function MapSkeleton() {
  return (
    <div className="flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-xl border bg-white shadow-sm" style={{ borderColor: "#e2e8f0" }}>
      <div className="flex items-center justify-between gap-4 px-4 pb-3 pt-4">
        <Shimmer className="h-3 w-56 rounded-full" />
        <div className="hidden items-center gap-3 sm:flex">
          <Shimmer className="h-3 w-16 rounded-full" />
          <Shimmer className="h-3 w-16 rounded-full" />
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden bg-slate-100">
        <Shimmer className="absolute inset-4 rounded-lg" />
        <Shimmer className="absolute left-[22%] top-[24%] h-3 w-3 rounded-full" />
        <Shimmer className="absolute left-[38%] top-[54%] h-3 w-3 rounded-full" />
        <Shimmer className="absolute left-[58%] top-[36%] h-3 w-3 rounded-full" />
        <Shimmer className="absolute left-[72%] top-[68%] h-3 w-3 rounded-full" />
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <CardSkeleton className="lg:w-72">
      <Shimmer className="mb-5 h-3 w-36 rounded-full" />
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <Shimmer className="h-3 w-28 rounded-full" />
              <Shimmer className="h-5 w-14 rounded-full" />
            </div>
            <Shimmer className="h-2.5 w-full rounded-full" />
            <Shimmer className="mt-2 h-2.5 w-2/3 rounded-full" />
          </div>
        ))}
      </div>
    </CardSkeleton>
  );
}

export function DashboardLoadingSkeleton() {
  return (
    <div className="flex max-w-full flex-col gap-4" aria-busy="true">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-7">
        {[0, 1, 2, 3, 4, 5, 6].map((item) => (
          <KpiSkeleton key={item} />
        ))}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <MapSkeleton />
        <ListSkeleton />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <CardSkeleton key={item} className="min-h-[140px]">
            <div className="space-y-4">
              <Shimmer className="h-3 w-32 rounded-full" />
              <Shimmer className="h-8 w-20 rounded-md" />
              <Shimmer className="h-2.5 w-full rounded-full" />
              <Shimmer className="h-2.5 w-4/5 rounded-full" />
            </div>
          </CardSkeleton>
        ))}
      </div>

      <ChartSkeleton tall />
    </div>
  );
}
