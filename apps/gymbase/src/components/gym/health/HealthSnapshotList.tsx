// HealthSnapshotList.tsx — Lista de snapshots históricos de métricas de salud

import { Card, CardContent, CardHeader, CardTitle } from "@core/components/ui/card";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { HealthSnapshot } from "@/types/gym-health";

interface HealthSnapshotListProps {
  snapshots: HealthSnapshot[];
}

function TrendIcon({ current, previous }: { current: number; previous: number }): React.ReactNode {
  if (current > previous) return <TrendingUp className="w-3 h-3 text-red-500" />;
  if (current < previous) return <TrendingDown className="w-3 h-3 text-green-500" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
}

export function HealthSnapshotList({ snapshots }: HealthSnapshotListProps): React.ReactNode {
  if (snapshots.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No hay mediciones registradas.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Historial de mediciones</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border">
          {snapshots.map((snap, i) => (
            <div key={snap.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{snap.weight_kg} kg</span>
                  {i < snapshots.length - 1 && (
                    <TrendIcon current={snap.weight_kg} previous={snapshots[i + 1].weight_kg} />
                  )}
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                  {snap.body_fat_pct !== null && <span>Grasa: {snap.body_fat_pct}%</span>}
                  {snap.muscle_mass_kg !== null && <span>Músculo: {snap.muscle_mass_kg} kg</span>}
                </div>
                {snap.notes && <p className="text-xs text-muted-foreground mt-1">{snap.notes}</p>}
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(snap.recorded_at).toLocaleDateString("es-CR", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
