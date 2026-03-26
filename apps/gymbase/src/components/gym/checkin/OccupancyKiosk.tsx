// OccupancyKiosk.tsx — Panel de ocupación full-screen para TV/kiosco público

"use client";

import { Users } from "lucide-react";
import { useOccupancy } from "@/hooks/useOccupancy";
import type { OccupancyLevel } from "@/types/gym-checkin";

const LEVEL_CONFIG: Record<OccupancyLevel, { label: string; bg: string; text: string }> = {
  free:     { label: "LIBRE",    bg: "bg-green-500",  text: "text-green-50" },
  moderate: { label: "MODERADO", bg: "bg-yellow-500", text: "text-yellow-50" },
  busy:     { label: "LLENO",    bg: "bg-orange-500", text: "text-orange-50" },
  full:     { label: "COMPLETO", bg: "bg-red-600",    text: "text-red-50" },
};

interface OccupancyKioskProps {
  orgId: string;
  gymName: string;
}

export function OccupancyKiosk({ orgId, gymName }: OccupancyKioskProps): React.ReactNode {
  const { current, capacity, level, percentage, isLoading } = useOccupancy(orgId);
  const config = LEVEL_CONFIG[level];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="animate-pulse text-2xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${config.bg} ${config.text} transition-colors duration-700`}>
      {/* Nombre del gym */}
      <p className="text-lg font-medium opacity-80 mb-4">{gymName}</p>

      {/* Número grande de personas */}
      <div className="text-[12rem] font-bold leading-none tracking-tight">
        {current}
      </div>

      {/* Label de nivel */}
      <div className="text-4xl font-bold mt-2 mb-6">{config.label}</div>

      {/* Barra de ocupación */}
      <div className="w-80 h-4 bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-white/60 rounded-full transition-all duration-700"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Info de capacidad */}
      <div className="flex items-center gap-2 mt-4 opacity-70">
        <Users className="w-5 h-5" />
        <span className="text-lg">
          {current} / {capacity}
        </span>
      </div>
    </div>
  );
}
