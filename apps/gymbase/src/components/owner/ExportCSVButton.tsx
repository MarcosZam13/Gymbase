// ExportCSVButton.tsx — Botón para descargar datos de un reporte como archivo CSV

"use client";

import { Download } from "lucide-react";
import { downloadCSV } from "@/lib/utils/csv";

interface ExportCSVButtonProps {
  filename: string;
  rows: Record<string, unknown>[];
  label?: string;
}

export function ExportCSVButton({ filename, rows, label = "Exportar CSV" }: ExportCSVButtonProps): React.ReactNode {
  return (
    <button
      onClick={() => downloadCSV(filename, rows)}
      disabled={rows.length === 0}
      className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        backgroundColor: "color-mix(in srgb, var(--gym-accent) 8%, transparent)",
        border: "1px solid color-mix(in srgb, var(--gym-accent) 25%, transparent)",
        color: "var(--gym-accent)",
      }}
      title={rows.length === 0 ? "Sin datos para exportar" : `Descargar ${filename}`}
    >
      <Download className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
