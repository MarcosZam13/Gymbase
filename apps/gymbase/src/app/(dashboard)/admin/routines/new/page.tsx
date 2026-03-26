// page.tsx — Página para crear una nueva rutina

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { RoutineForm } from "@/components/gym/routines/RoutineForm";

export default function NewRoutinePage(): React.ReactNode {
  return (
    <div className="space-y-6 max-w-2xl">
      {/* Navegación de vuelta */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 -ml-2">
          <Link href="/admin/routines">
            <ArrowLeft className="w-4 h-4" />
            Rutinas
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Nueva rutina</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Define los metadatos de la rutina. Después podrás agregar días y ejercicios en el editor.
        </p>
      </div>

      <RoutineForm />
    </div>
  );
}
