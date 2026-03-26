// page.tsx — Página para crear un nuevo reto

import { ChallengeForm } from "@/components/gym/challenges/ChallengeForm";

export default function NewChallengePage(): React.ReactNode {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Nuevo Reto</h1>
        <p className="text-muted-foreground">Crea un nuevo reto para tus miembros</p>
      </div>
      <ChallengeForm />
    </div>
  );
}
