// ChallengeRanking.tsx — Tabla de posiciones de un reto

import { Card, CardContent, CardHeader, CardTitle } from "@core/components/ui/card";
import { Badge } from "@core/components/ui/badge";
import { Trophy } from "lucide-react";
import type { ChallengeParticipant, Challenge } from "@/types/gym-challenges";

interface ChallengeRankingProps {
  participants: ChallengeParticipant[];
  challenge: Challenge;
}

export function ChallengeRanking({ participants, challenge }: ChallengeRankingProps): React.ReactNode {
  // Ordenar por progreso total descendente
  const sorted = [...participants].sort((a, b) => (b.total_progress ?? 0) - (a.total_progress ?? 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          Ranking
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin participantes aún.</p>
        ) : (
          <div className="divide-y divide-border">
            {sorted.map((p, i) => {
              const progress = p.total_progress ?? 0;
              const pct = Math.min(100, Math.round((progress / challenge.goal_value) * 100));
              return (
                <div key={p.id} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-100 text-yellow-800" : i === 1 ? "bg-gray-100 text-gray-700" : i === 2 ? "bg-orange-100 text-orange-800" : "bg-surface text-muted-foreground"}`}>
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{p.profile?.full_name ?? "Participante"}</p>
                      <p className="text-xs text-muted-foreground">{progress} / {challenge.goal_value} {challenge.goal_unit}</p>
                    </div>
                  </div>
                  <Badge variant={pct >= 100 ? "default" : "outline"} className="text-xs">{pct}%</Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
