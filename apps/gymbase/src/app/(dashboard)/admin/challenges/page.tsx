// page.tsx — Gestión de retos para admin

import Link from "next/link";
import { Plus, Trophy, Users, Calendar } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { Card, CardContent } from "@core/components/ui/card";
import { Badge } from "@core/components/ui/badge";
import { getChallenges } from "@/actions/challenge.actions";

const TYPE_LABELS: Record<string, string> = {
  attendance: "Asistencia",
  workout: "Entrenamiento",
  weight: "Peso",
  custom: "Personalizado",
};

export default async function AdminChallengesPage(): Promise<React.ReactNode> {
  const challenges = await getChallenges();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Retos</h1>
          <p className="text-muted-foreground">Gestión de retos y competencias</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/admin/challenges/new">
            <Plus className="w-4 h-4" />
            Nuevo reto
          </Link>
        </Button>
      </div>

      {challenges.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No hay retos creados. Crea el primero.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {challenges.map((challenge) => {
            const now = new Date();
            const isActive = now >= new Date(challenge.starts_at) && now <= new Date(challenge.ends_at);
            return (
              <Card key={challenge.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-primary" />
                      <Link href={`/admin/challenges/${challenge.id}`} className="font-medium text-sm hover:underline">
                        {challenge.title}
                      </Link>
                    </div>
                    {isActive ? <Badge variant="default">Activo</Badge> : <Badge variant="secondary">Inactivo</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{TYPE_LABELS[challenge.type] ?? challenge.type}</span>
                    <span>Meta: {challenge.goal_value} {challenge.goal_unit}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{challenge.participants_count ?? 0}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />
                      {new Date(challenge.starts_at).toLocaleDateString("es-CR", { day: "2-digit", month: "short" })} - {new Date(challenge.ends_at).toLocaleDateString("es-CR", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
