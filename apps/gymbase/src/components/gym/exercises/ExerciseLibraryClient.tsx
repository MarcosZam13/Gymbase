// ExerciseLibraryClient.tsx — Tabla de ejercicios con búsqueda, filtros y acciones CRUD

"use client";

import { useState, useDeferredValue, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Search, Pencil, Trash2, Video, Timer, Repeat, Dumbbell,
} from "lucide-react";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { removeExercise } from "@/actions/exercise.actions";
import { ExerciseForm } from "@/components/gym/exercises/ExerciseForm";
import type { Exercise, DifficultyLevel } from "@/types/gym-routines";

const MUSCLE_FILTERS = [
  { value: "", label: "Todos" },
  { value: "chest", label: "Pecho" },
  { value: "back", label: "Espalda" },
  { value: "shoulders", label: "Hombros" },
  { value: "biceps", label: "Bíceps" },
  { value: "triceps", label: "Tríceps" },
  { value: "legs", label: "Piernas" },
  { value: "core", label: "Core" },
  { value: "cardio", label: "Cardio" },
  { value: "full_body", label: "Cuerpo completo" },
] as const;

const MUSCLE_LABELS: Record<string, string> = Object.fromEntries(
  MUSCLE_FILTERS.filter((f) => f.value).map((f) => [f.value, f.label])
);

const DIFFICULTY_BADGE: Record<DifficultyLevel, { label: string; className: string }> = {
  beginner:     { label: "Principiante", className: "bg-emerald-100 text-emerald-700" },
  intermediate: { label: "Intermedio",   className: "bg-amber-100 text-amber-700" },
  advanced:     { label: "Avanzado",     className: "bg-orange-100 text-orange-700" },
  expert:       { label: "Experto",      className: "bg-red-100 text-red-700" },
};

interface ExerciseLibraryClientProps {
  exercises: Exercise[];
}

export function ExerciseLibraryClient({ exercises }: ExerciseLibraryClientProps): React.ReactNode {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Búsqueda diferida para no bloquear el input mientras filtra
  const deferredSearch = useDeferredValue(search);

  const filtered = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();
    return exercises.filter((ex) => {
      const matchesMuscle = !muscleFilter || ex.muscle_group === muscleFilter;
      const matchesSearch =
        !q ||
        ex.name.toLowerCase().includes(q) ||
        (ex.equipment ?? "").toLowerCase().includes(q) ||
        (ex.muscle_group ?? "").toLowerCase().includes(q);
      return matchesMuscle && matchesSearch;
    });
  }, [exercises, muscleFilter, deferredSearch]);

  // Estadísticas del sidebar calculadas sobre la lista completa
  const stats = useMemo(() => {
    const withVideo = exercises.filter((e) => e.video_url).length;
    const timed = exercises.filter((e) => e.is_timed).length;
    const byMuscle = MUSCLE_FILTERS.filter((f) => f.value).map((f) => ({
      label: f.label,
      count: exercises.filter((e) => e.muscle_group === f.value).length,
    })).filter((m) => m.count > 0).sort((a, b) => b.count - a.count).slice(0, 6);
    return { withVideo, timed, byMuscle };
  }, [exercises]);

  async function handleDelete(id: string): Promise<void> {
    if (!confirm("¿Eliminar este ejercicio? Esta acción no se puede deshacer.")) return;
    setDeletingId(id);
    await removeExercise(id);
    setDeletingId(null);
    router.refresh();
  }

  function handleSaved(): void {
    setShowForm(false);
    setEditingExercise(null);
    router.refresh();
  }

  return (
    <>
      {/* Modal de formulario */}
      {(showForm || editingExercise) && (
        <ExerciseForm
          exercise={editingExercise ?? undefined}
          onClose={() => { setShowForm(false); setEditingExercise(null); }}
          onSaved={handleSaved}
        />
      )}

      <div className="flex gap-6">
        {/* Columna principal — tabla */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Barra de búsqueda y filtros */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ejercicio..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setShowForm(true)} className="gap-2 shrink-0">
              <Plus className="w-4 h-4" />
              Nuevo ejercicio
            </Button>
          </div>

          {/* Chips de filtro por músculo */}
          <div className="flex flex-wrap gap-2">
            {MUSCLE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setMuscleFilter(f.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                  muscleFilter === f.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-transparent hover:border-border"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Tabla de ejercicios */}
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Ejercicio</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Músculo</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Dificultad</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Tipo</th>
                  <th className="w-10 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                      {exercises.length === 0
                        ? "No hay ejercicios todavía. Crea el primero."
                        : "Sin resultados para esa búsqueda."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((ex) => {
                    const diff = DIFFICULTY_BADGE[ex.difficulty];
                    return (
                      <tr key={ex.id} className="hover:bg-muted/30 transition-colors">
                        {/* Nombre + equipamiento */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                              <Dumbbell className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground leading-tight">{ex.name}</p>
                              {ex.equipment && (
                                <p className="text-xs text-muted-foreground">{ex.equipment}</p>
                              )}
                            </div>
                            {/* Indicador de video */}
                            {ex.video_url && (
                              <a
                                href={ex.video_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-auto shrink-0 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center hover:bg-blue-200 transition-colors"
                                title="Ver video"
                              >
                                <Video className="w-3 h-3 text-blue-600" />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Músculo */}
                        <td className="px-4 py-3 hidden sm:table-cell">
                          {ex.muscle_group ? (
                            <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">
                              {MUSCLE_LABELS[ex.muscle_group] ?? ex.muscle_group}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>

                        {/* Dificultad */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${diff.className}`}>
                            {diff.label}
                          </span>
                        </td>

                        {/* Tipo: reps o timed */}
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            {ex.is_timed ? (
                              <>
                                <Timer className="w-3.5 h-3.5" />
                                {ex.duration_seconds ? `${ex.duration_seconds}s` : "Tiempo"}
                              </>
                            ) : (
                              <>
                                <Repeat className="w-3.5 h-3.5" />
                                Reps
                              </>
                            )}
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => setEditingExercise(ex)}
                              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(ex.id)}
                              disabled={deletingId === ex.id}
                              className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Contador de resultados */}
          {exercises.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {filtered.length} de {exercises.length} ejercicio{exercises.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Sidebar de estadísticas */}
        <aside className="w-56 shrink-0 hidden xl:block space-y-4">
          <div className="rounded-lg border border-border p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Biblioteca</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium">{exercises.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Con video</span>
                <span className="font-medium">{stats.withVideo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cronometrados</span>
                <span className="font-medium">{stats.timed}</span>
              </div>
            </div>
          </div>

          {stats.byMuscle.length > 0 && (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Por músculo</h3>
              <div className="space-y-2">
                {stats.byMuscle.map((m) => (
                  <div key={m.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{m.label}</span>
                      <span className="font-medium">{m.count}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.round((m.count / exercises.length) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
