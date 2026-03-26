// ProgressChart.tsx — Gráfica de progreso de métricas corporales con Recharts

"use client";

import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@core/components/ui/button";
import type { ProgressChartData } from "@/types/gym-progress";

interface ProgressChartProps {
  data: ProgressChartData[];
}

type MetricKey = "weight_kg" | "body_fat_pct" | "muscle_mass_kg";

const METRICS: { key: MetricKey; label: string; color: string; unit: string }[] = [
  { key: "weight_kg", label: "Peso", color: "#3B82F6", unit: "kg" },
  { key: "body_fat_pct", label: "Grasa", color: "#EF4444", unit: "%" },
  { key: "muscle_mass_kg", label: "Músculo", color: "#10B981", unit: "kg" },
];

export function ProgressChart({ data }: ProgressChartProps): React.ReactNode {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("weight_kg");
  const metric = METRICS.find((m) => m.key === activeMetric)!;

  if (data.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        No hay datos de progreso aún. Registra tu primera medición.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {METRICS.map((m) => (
          <Button
            key={m.key}
            size="sm"
            variant={activeMetric === m.key ? "default" : "outline"}
            onClick={() => setActiveMetric(m.key)}
            className="text-xs"
          >
            {m.label}
          </Button>
        ))}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
            <YAxis className="text-xs" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              formatter={(value) => [`${value} ${metric.unit}`, metric.label]}
            />
            <Line
              type="monotone"
              dataKey={activeMetric}
              stroke={metric.color}
              strokeWidth={2}
              dot={{ r: 4, fill: metric.color }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
