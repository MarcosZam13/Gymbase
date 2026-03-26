// OccupancyWidget.tsx — Widget de ocupación con barra, nivel y contador

"use client";

import { Activity } from "lucide-react";
import type { OccupancyData, OccupancyLevel } from "@/types/gym-checkin";

const LEVEL_CONFIG: Record<OccupancyLevel, { label: string; color: string }> = {
  free:     { label: "Libre",    color: "#22C55E" },
  moderate: { label: "Moderado", color: "#FACC15" },
  busy:     { label: "Lleno",    color: "#FACC15" },
  full:     { label: "Completo", color: "#EF4444" },
};

interface OccupancyWidgetProps {
  data: OccupancyData;
}

export function OccupancyWidget({ data }: OccupancyWidgetProps): React.ReactNode {
  const config = LEVEL_CONFIG[data.level];

  return (
    <div
      className="p-4 rounded-2xl"
      style={{
        backgroundColor: "var(--gym-bg-card)",
        border: "1px solid var(--gym-border)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" style={{ color: config.color }} />
          <span className="text-sm font-medium" style={{ color: "var(--gym-text-secondary)" }}>
            Ocupación actual
          </span>
        </div>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: `${config.color}15`,
            color: config.color,
          }}
        >
          {config.label}
        </span>
      </div>

      <div className="space-y-2">
        {/* Barra de progreso */}
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: "var(--gym-bg-elevated)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${data.percentage}%`, backgroundColor: config.color }}
          />
        </div>

        <div className="flex justify-between text-xs" style={{ color: "var(--gym-text-muted)" }}>
          <span>{data.current} persona{data.current !== 1 ? "s" : ""}</span>
          <span>{data.percentage}% · Cap. {data.capacity}</span>
        </div>
      </div>
    </div>
  );
}
