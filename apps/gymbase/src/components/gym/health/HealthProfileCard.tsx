// HealthProfileCard.tsx — Tarjeta resumen del perfil de salud de un miembro

import { Card, CardContent, CardHeader, CardTitle } from "@core/components/ui/card";
import { Badge } from "@core/components/ui/badge";
import { Heart, Ruler, Weight, Activity, Target } from "lucide-react";
import type { HealthProfile, FitnessLevel } from "@/types/gym-health";

const FITNESS_LABELS: Record<FitnessLevel, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
  athlete: "Atleta",
};

interface HealthProfileCardProps {
  profile: HealthProfile | null;
}

function MetricRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number | null }): React.ReactNode {
  if (value === null || value === undefined) return null;
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </div>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function HealthProfileCard({ profile }: HealthProfileCardProps): React.ReactNode {
  if (!profile) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No hay perfil de salud registrado.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Perfil de Salud</CardTitle>
          {profile.fitness_level && (
            <Badge variant="outline">{FITNESS_LABELS[profile.fitness_level]}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <MetricRow icon={Weight} label="Peso" value={profile.weight_kg ? `${profile.weight_kg} kg` : null} />
        <MetricRow icon={Ruler} label="Altura" value={profile.height_cm ? `${profile.height_cm} cm` : null} />
        <MetricRow icon={Activity} label="IMC" value={profile.bmi} />
        <MetricRow icon={Activity} label="Grasa corporal" value={profile.body_fat_pct ? `${profile.body_fat_pct}%` : null} />
        <MetricRow icon={Weight} label="Masa muscular" value={profile.muscle_mass_kg ? `${profile.muscle_mass_kg} kg` : null} />
        <MetricRow icon={Heart} label="FC en reposo" value={profile.resting_heart_rate ? `${profile.resting_heart_rate} bpm` : null} />
        {profile.goals && profile.goals.length > 0 && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Target className="w-4 h-4" />
              <span>Objetivos</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {profile.goals.map((goal) => (
                <Badge key={goal} variant="secondary" className="text-xs">{goal}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
