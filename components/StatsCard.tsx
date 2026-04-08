import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  accent?: "blue" | "green" | "orange" | "red";
}

const accentColors = {
  blue: { border: "#2e6da4", icon: "#2e6da4", bg: "#eff6ff" },
  green: { border: "#16a34a", icon: "#16a34a", bg: "#f0fdf4" },
  orange: { border: "#ea580c", icon: "#ea580c", bg: "#fff7ed" },
  red: { border: "#dc2626", icon: "#dc2626", bg: "#fef2f2" },
};

export function StatsCard({ title, value, subtitle, icon: Icon, accent = "blue" }: StatsCardProps) {
  const colors = accentColors[accent];
  return (
    <Card className="rounded-2xl shadow-sm border" style={{ borderColor: `${colors.border}30` }}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <div className="p-2 rounded-xl" style={{ backgroundColor: colors.bg }}>
          <Icon className="w-4 h-4" style={{ color: colors.icon }} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
