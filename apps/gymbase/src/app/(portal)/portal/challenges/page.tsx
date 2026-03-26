// page.tsx — Lista de retos disponibles para el miembro

import { getChallenges, getMyBadges } from "@/actions/challenge.actions";
import { ChallengeCard } from "@/components/gym/challenges/ChallengeCard";
import { BadgeDisplay } from "@/components/gym/challenges/BadgeDisplay";
import { themeConfig } from "@/lib/theme";
import { getCurrentUser } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { fetchMyParticipation } from "@/services/challenge.service";

export default async function PortalChallengesPage(): Promise<React.ReactNode> {
  if (!themeConfig.features.gym_challenges) return null;

  const [challenges, badges, user] = await Promise.all([
    getChallenges(),
    getMyBadges(),
    getCurrentUser(),
  ]);

  // Determinar en qué retos está inscrito el usuario
  const supabase = await createClient();
  const joinedIds = new Set<string>();
  if (user) {
    await Promise.all(
      challenges.map(async (c) => {
        const participation = await fetchMyParticipation(supabase, c.id, user.id);
        if (participation) joinedIds.add(c.id);
      })
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Retos</h1>
        <p className="text-muted-foreground">Participa en retos y gana insignias</p>
      </div>

      <BadgeDisplay badges={badges} />

      {challenges.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">No hay retos disponibles.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {challenges.map((challenge) => (
            <ChallengeCard key={challenge.id} challenge={challenge} isJoined={joinedIds.has(challenge.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
