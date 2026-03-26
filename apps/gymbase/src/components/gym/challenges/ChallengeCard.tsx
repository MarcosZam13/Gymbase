// ChallengeCard.tsx — Tarjeta de reto con info, participantes y countdown

"use client";

import { useState } from "react";
import Link from "next/link";
import { Trophy, Users, Calendar, Loader2 } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { Card, CardContent } from "@core/components/ui/card";
import { Badge } from "@core/components/ui/badge";
import { joinChallenge } from "@/actions/challenge.actions";
import type { Challenge } from "@/types/gym-challenges";

interface ChallengeCardProps {
  challenge: Challenge;
  isJoined: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  attendance: "Asistencia",
  workout: "Entrenamiento",
  weight: "Peso",
  custom: "Personalizado",
};

export function ChallengeCard({ challenge, isJoined }: ChallengeCardProps): React.ReactNode {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const startsAt = new Date(challenge.starts_at);
  const endsAt = new Date(challenge.ends_at);
  const isActive = now >= startsAt && now <= endsAt;
  const isUpcoming = now < startsAt;
  const daysLeft = Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  async function handleJoin(): Promise<void> {
    setIsLoading(true);
    setError(null);
    const result = await joinChallenge(challenge.id);
    if (!result.success) {
      const msg = typeof result.error === "string" ? result.error : "Error al unirse";
      setError(msg);
    }
    setIsLoading(false);
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              <Link href={`/portal/challenges/${challenge.id}`} className="font-medium text-sm hover:underline">
                {challenge.title}
              </Link>
            </div>
            {challenge.description && <p className="text-xs text-muted-foreground line-clamp-2">{challenge.description}</p>}
          </div>
          {isActive && <Badge variant="default">Activo</Badge>}
          {isUpcoming && <Badge variant="outline">Próximo</Badge>}
          {!isActive && !isUpcoming && <Badge variant="secondary">Finalizado</Badge>}
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>{TYPE_LABELS[challenge.type] ?? challenge.type}</span>
          <span>Meta: {challenge.goal_value} {challenge.goal_unit}</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{challenge.participants_count ?? 0}</span>
          {isActive && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{daysLeft} días restantes</span>}
        </div>

        {challenge.prize_description && (
          <p className="text-xs text-primary font-medium">Premio: {challenge.prize_description}</p>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

        {(isActive || isUpcoming) && !isJoined && (
          <Button size="sm" onClick={handleJoin} disabled={isLoading} className="gap-1 text-xs">
            {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            Unirme
          </Button>
        )}
        {isJoined && (
          <Button size="sm" variant="outline" asChild className="text-xs">
            <Link href={`/portal/challenges/${challenge.id}`}>Ver progreso</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
