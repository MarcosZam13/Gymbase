// BadgeDisplay.tsx — Muestra insignias ganadas por el miembro

import { Award, Trophy, Medal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@core/components/ui/card";
import type { ChallengeBadge } from "@/types/gym-challenges";

interface BadgeDisplayProps {
  badges: ChallengeBadge[];
}

const BADGE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  completed: { icon: Award, color: "text-blue-600", label: "Completado" },
  winner: { icon: Trophy, color: "text-yellow-600", label: "Ganador" },
  top3: { icon: Medal, color: "text-orange-600", label: "Top 3" },
};

export function BadgeDisplay({ badges }: BadgeDisplayProps): React.ReactNode {
  if (badges.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          Aún no tienes insignias. Participa en retos para ganar.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mis insignias</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {badges.map((badge) => {
            const config = BADGE_CONFIG[badge.type] ?? BADGE_CONFIG.completed;
            const Icon = config.icon;
            return (
              <div key={badge.id} className="flex flex-col items-center gap-1 p-3 bg-surface rounded-lg">
                <Icon className={`w-8 h-8 ${config.color}`} />
                <span className="text-xs font-medium">{config.label}</span>
                <span className="text-xs text-muted-foreground text-center">{badge.challenge?.title ?? "Reto"}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(badge.earned_at).toLocaleDateString("es-CR", { day: "2-digit", month: "short" })}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
