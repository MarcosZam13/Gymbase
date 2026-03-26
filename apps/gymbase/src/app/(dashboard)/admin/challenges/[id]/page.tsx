// page.tsx — Detalle de un reto para admin con ranking de participantes

import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@core/components/ui/card";
import { Badge } from "@core/components/ui/badge";
import { Trophy, Target, Calendar, Users } from "lucide-react";
import { getChallengeDetail } from "@/actions/challenge.actions";
import { ChallengeRanking } from "@/components/gym/challenges/ChallengeRanking";

interface Props {
  params: Promise<{ id: string }>;
}

const TYPE_LABELS: Record<string, string> = {
  attendance: "Asistencia",
  workout: "Entrenamiento",
  weight: "Peso",
  custom: "Personalizado",
};

export default async function AdminChallengeDetailPage({ params }: Props): Promise<React.ReactNode> {
  const { id } = await params;
  const { challenge, participants } = await getChallengeDetail(id);
  if (!challenge) notFound();

  const now = new Date();
  const isActive = now >= new Date(challenge.starts_at) && now <= new Date(challenge.ends_at);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{challenge.title}</h1>
        <p className="text-muted-foreground">{challenge.description ?? "Sin descripción"}</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              <span>{TYPE_LABELS[challenge.type] ?? challenge.type}</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <span>{challenge.goal_value} {challenge.goal_unit}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span>{new Date(challenge.starts_at).toLocaleDateString("es-CR")} - {new Date(challenge.ends_at).toLocaleDateString("es-CR")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span>{participants.length} participantes</span>
            </div>
            {isActive ? <Badge variant="default">Activo</Badge> : <Badge variant="secondary">Inactivo</Badge>}
          </div>
          {challenge.prize_description && (
            <p className="text-sm text-primary mt-3 font-medium">Premio: {challenge.prize_description}</p>
          )}
        </CardContent>
      </Card>

      <ChallengeRanking participants={participants} challenge={challenge} />
    </div>
  );
}
