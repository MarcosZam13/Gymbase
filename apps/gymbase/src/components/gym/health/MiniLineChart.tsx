// MiniLineChart.tsx — Gráfica SVG de línea reutilizable para admin y portal

"use client";

export interface ChartPoint {
  date: string;
  value: number;
}

export interface SvgDimensions {
  W: number;
  H: number;
  PAD: { top: number; right: number; bottom: number; left: number };
  fontSize: number;
  dotRadius: number;
  strokeWidth: number;
}

interface MiniLineChartProps {
  points: ChartPoint[];
  color: string;
  label: string;
  dims?: SvgDimensions;
}

export const MINI_CHART_DIMS: SvgDimensions = {
  W: 400,
  H: 110,
  PAD: { top: 10, right: 8, bottom: 22, left: 32 },
  fontSize: 7,
  dotRadius: 2.5,
  strokeWidth: 1.5,
};

// Renderiza una gráfica SVG de línea con área de relleno y etiquetas de ejes
export function MiniLineChart({
  points,
  color,
  label,
  dims = MINI_CHART_DIMS,
}: MiniLineChartProps): React.ReactNode {
  const { W, H, PAD, fontSize, dotRadius, strokeWidth } = dims;

  if (points.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-[#444]"
        style={{ height: H, fontSize: fontSize + 2 }}
      >
        Se necesitan al menos 2 mediciones
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const coords = points.map((p, i) => ({
    x: PAD.left + (i / (points.length - 1)) * innerW,
    y: PAD.top + (1 - (p.value - minVal) / range) * innerH,
    date: p.date,
    value: p.value,
  }));

  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");

  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${H - PAD.bottom} L ${coords[0].x.toFixed(1)} ${H - PAD.bottom} Z`;

  const gradId = `grad-${label}`;

  // Etiquetas X distribuidas para evitar solapamiento
  const maxXLabels = Math.min(points.length, Math.floor(innerW / 40));
  const xLabelStep = Math.max(1, Math.floor((points.length - 1) / (maxXLabels - 1)));
  const xLabelIdxs = new Set<number>();
  for (let i = 0; i < points.length; i += xLabelStep) xLabelIdxs.add(i);
  xLabelIdxs.add(points.length - 1);

  // 4 niveles de etiquetas en el eje Y
  const yLabelCount = 4;
  const yLabels = Array.from({ length: yLabelCount }, (_, i) => {
    const t = i / (yLabelCount - 1);
    return { y: PAD.top + t * innerH, value: maxVal - t * range };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Líneas de cuadrícula */}
      {yLabels.map(({ y }) => (
        <line key={y} x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#1e1e1e" strokeWidth="1" />
      ))}

      {/* Área de relleno */}
      <path d={areaPath} fill={`url(#${gradId})`} />

      {/* Línea principal */}
      <path d={linePath} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />

      {/* Puntos */}
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={dotRadius} fill={color} stroke="#0d0d0d" strokeWidth={strokeWidth * 0.8} />
      ))}

      {/* Etiquetas eje Y */}
      {yLabels.map(({ y, value }) => (
        <text key={y} x={PAD.left - 5} y={y + fontSize * 0.35} textAnchor="end" fontSize={fontSize} fill="#555" fontFamily="DM Sans, sans-serif">
          {value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}
        </text>
      ))}

      {/* Etiquetas eje X */}
      {[...xLabelIdxs].map((i) => (
        <text key={i} x={coords[i].x} y={H - 4} textAnchor="middle" fontSize={fontSize} fill="#555" fontFamily="DM Sans, sans-serif">
          {coords[i].date}
        </text>
      ))}
    </svg>
  );
}
