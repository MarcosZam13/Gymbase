// page.tsx — Admin de rutinas con pestañas: Rutinas y Ejercicios

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { getRoutines } from "@/actions/routine.actions";
import { getExercises } from "@/actions/exercise.actions";
import { RoutineList } from "@/components/gym/routines/RoutineList";
import { ExerciseLibraryClient } from "@/components/gym/exercises/ExerciseLibraryClient";

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

export default async function AdminRoutinesPage({ searchParams }: Props): Promise<React.ReactNode> {
  const { tab } = await searchParams;
  // La pestaña activa es "routines" por defecto; "exercises" muestra la biblioteca
  const activeTab = tab === "exercises" ? "exercises" : "routines";

  // Cargar solo los datos necesarios para la pestaña activa
  const [routines, exercises] = await Promise.all([
    getRoutines(),
    getExercises(),
  ]);

  return (
    <div className="space-y-6">
      {/* Cabecera con título y acción principal */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rutinas y Ejercicios</h1>
          <p className="text-muted-foreground text-sm">
            Gestiona plantillas de entrenamiento y la biblioteca de ejercicios
          </p>
        </div>
        {activeTab === "routines" ? (
          <Button asChild className="gap-2">
            <Link href="/admin/routines/new">
              <Plus className="w-4 h-4" />
              Nueva rutina
            </Link>
          </Button>
        ) : null}
      </div>

      {/* Pestañas */}
      <div className="border-b border-border">
        <nav className="flex gap-1 -mb-px">
          <Link
            href="/admin/routines"
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "routines"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            Rutinas
            {routines.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">
                {routines.length}
              </span>
            )}
          </Link>
          <Link
            href="/admin/routines?tab=exercises"
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "exercises"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            Ejercicios
            {exercises.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">
                {exercises.length}
              </span>
            )}
          </Link>
        </nav>
      </div>

      {/* Contenido de la pestaña activa */}
      {activeTab === "routines" ? (
        <RoutineList routines={routines} />
      ) : (
        <ExerciseLibraryClient exercises={exercises} />
      )}
    </div>
  );
}
