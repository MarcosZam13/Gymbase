// page.tsx — Detalle de reto con progreso del miembro y ranking

import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@core/components/ui/card";
import { Badge } from "@core/components/ui/badge";
import { Trophy, Target } from "lucide-react";
import { getChallengeDetail } from "@/actions/challenge.actions";
import { ChallengeRanking } from "@/components/gym/challenges/ChallengeRanking";
import { LogProgressForm } from "@/components/gym/challenges/LogProgressForm";
import { themeConfig } from "@/lib/theme";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PortalChallengeDetailPage({ params }: Props): Promise<React.ReactNode> {
  if (!themeConfig.features.gym_challenges) return null;

  const { id } = await params;
  const { challenge, participants, myParticipation, myProgress } = await getChallengeDetail(id);
  if (!challenge) notFound();

  const now = new Date();
  const isActive = now >= new Date(challenge.starts_at) && now <= new Date(challenge.ends_at);
  const progressPct = Math.min(100, Math.round((myProgress / challenge.goal_value) * 100));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{challenge.title}</h1>
        {challenge.description && <p className="text-muted-foreground">{challenge.description}</p>}
      </div>

      {/* Mi progreso */}
      {myParticipation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Mi progreso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>{myProgress} / {challenge.goal_value} {challenge.goal_unit}</span>
              <Badge variant={progressPct >= 100 ? "default" : "outline"}>{progressPct}%</Badge>
            </div>
            <div className="w-full bg-surface rounded-full h-3">
              <div className="bg-primary h-3 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            {isActive && (
              <div className="pt-2 border-t border-border">
                <LogProgressForm challengeId={challenge.id} goalUnit={challenge.goal_unit} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ChallengeRanking participants={participants} challenge={challenge} />
    </div>
  );
}
