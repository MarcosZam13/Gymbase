// HealthChartCard.tsx — Card de gráfica de evolución de salud con vista expandida en overlay propio

"use client";

import { useState, useEffect } from "react";
import { Maximize2, X } from "lucide-react";
import { MiniLineChart, type SvgDimensions } from "./MiniLineChart";

// Re-exportar ChartPoint para mantener compatibilidad con importaciones existentes
export type { ChartPoint } from "./MiniLineChart";

import type { ChartPoint } from "./MiniLineChart";

interface HealthChartCardProps {
  points: ChartPoint[];
  color: string;
  unit: string;
  label: string;
  title: string;
}

const COMPACT_DIMS: SvgDimensions = {
  W: 400,
  H: 140,
  PAD: { top: 10, right: 8, bottom: 24, left: 36 },
  fontSize: 7,
  dotRadius: 2.5,
  strokeWidth: 1.5,
};

const EXPANDED_DIMS: SvgDimensions = {
  W: 900,
  H: 320,
  PAD: { top: 16, right: 16, bottom: 36, left: 52 },
  fontSize: 11,
  dotRadius: 4,
  strokeWidth: 2,
};

export function HealthChartCard({
  points,
  color,
  unit,
  label,
  title,
}: HealthChartCardProps): React.ReactNode {
  const [open, setOpen] = useState(false);

  // Cerrar con ESC y bloquear scroll del body mientras está abierto
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div className="bg-[#111] border border-[#1a1a1a] rounded-[14px] p-4">
        <div className="flex items-center justify-between mb-3">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.08em]"
            style={{ color }}
          >
            {title}
          </p>
          {/* Botón expandir — solo si hay datos suficientes para graficar */}
          {points.length >= 2 && (
            <button
              onClick={() => setOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[9px] text-[#555] hover:text-[#888] hover:bg-[#1a1a1a] transition-colors"
              aria-label={`Expandir gráfica de ${title}`}
            >
              <Maximize2 className="w-3 h-3" />
              Expandir
            </button>
          )}
        </div>
        <MiniLineChart points={points} color={color} label={label} dims={COMPACT_DIMS} />
      </div>

      {/* Overlay propio — z-[200] garantiza que queda sobre sidebar y navbar */}
      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-6"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-4xl bg-[#111] border border-[#1e1e1e] rounded-[16px] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1e1e1e]">
              <div className="flex items-center gap-3">
                <p
                  className="text-[13px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color }}
                >
                  {title}
                </p>
                {points.length >= 2 && (
                  <span className="text-[11px] text-[#444]">
                    {points.length} mediciones
                    {" · "}
                    <span style={{ color }}>
                      {points[0].value.toFixed(1)} → {points[points.length - 1].value.toFixed(1)} {unit}
                    </span>
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-[#444] hover:text-[#888] hover:bg-[#1a1a1a] transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Gráfica expandida */}
            <MiniLineChart
              points={points}
              color={color}
              label={`${label}-expanded`}
              dims={EXPANDED_DIMS}
            />

            {/* Tabla de mediciones — scrollable si hay muchas */}
            {points.length > 0 && (
              <div className="mt-4 border-t border-[#1a1a1a] pt-3 max-h-40 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6">
                  {[...points].reverse().map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-1.5 border-b border-[#141414] last:border-0"
                    >
                      <span className="text-[11px] text-[#555]">{p.date}</span>
                      <span className="text-[12px] font-medium" style={{ color }}>
                        {p.value.toFixed(1)} {unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
