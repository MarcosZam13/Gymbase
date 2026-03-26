// ProgressSummaryCard.tsx — Tarjeta resumen de progreso comparando primera y última medición

import { TrendingUp, TrendingDown, Minus, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@core/components/ui/card";
import type { HealthSnapshot } from "@/types/gym-health";

interface ProgressSummaryCardProps {
  snapshots: HealthSnapshot[];
}

function DeltaDisplay({ label, current, initial, unit, invertColor }: {
  label: string; current: number; initial: number; unit: string; invertColor?: boolean;
}): React.ReactNode {
  const delta = Math.round((current - initial) * 10) / 10;
  const isPositive = delta > 0;
  // Para grasa, bajar es bueno (invertColor=true)
  const isGood = invertColor ? !isPositive : isPositive;

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <span className="font-medium">{current} {unit}</span>
        {delta !== 0 && (
          <span className={`text-xs flex items-center gap-0.5 ${isGood ? "text-green-600" : "text-red-600"}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isPositive ? "+" : ""}{delta}
          </span>
        )}
        {delta === 0 && <Minus className="w-3 h-3 text-muted-foreground" />}
      </div>
    </div>
  );
}

export function ProgressSummaryCard({ snapshots }: ProgressSummaryCardProps): React.ReactNode {
  if (snapshots.length < 2) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          Se necesitan al menos 2 mediciones para ver tu progreso.
        </CardContent>
      </Card>
    );
  }

  // snapshots viene desc, así que [0] es el más reciente
  const latest = snapshots[0];
  const first = snapshots[snapshots.length - 1];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Scale className="w-4 h-4 text-primary" />
          Resumen de progreso
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <DeltaDisplay label="Peso" current={latest.weight_kg} initial={first.weight_kg} unit="kg" />
        {latest.body_fat_pct !== null && first.body_fat_pct !== null && (
          <DeltaDisplay label="Grasa" current={latest.body_fat_pct} initial={first.body_fat_pct} unit="%" invertColor />
        )}
        {latest.muscle_mass_kg !== null && first.muscle_mass_kg !== null && (
          <DeltaDisplay label="Músculo" current={latest.muscle_mass_kg} initial={first.muscle_mass_kg} unit="kg" />
        )}
        <p className="text-xs text-muted-foreground pt-2 border-t border-border">
          Comparando {snapshots.length} mediciones desde {new Date(first.recorded_at).toLocaleDateString("es-CR", { day: "2-digit", month: "short", year: "numeric" })}
        </p>
      </CardContent>
    </Card>
  );
}
