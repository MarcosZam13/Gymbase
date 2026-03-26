// ExerciseForm.tsx — Modal para crear o editar un ejercicio de la biblioteca

"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, Timer, Repeat } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { Label } from "@core/components/ui/label";
import { createExercise, editExercise } from "@/actions/exercise.actions";
import { createExerciseSchema, type CreateExerciseInput } from "@/lib/validations/routines";
import type { Exercise, DifficultyLevel } from "@/types/gym-routines";

// Grupos musculares disponibles para filtrar y clasificar ejercicios
const MUSCLE_GROUPS = [
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

const EQUIPMENT_OPTIONS = [
  { value: "none", label: "Sin equipo" },
  { value: "barbell", label: "Barra" },
  { value: "dumbbell", label: "Mancuernas" },
  { value: "machine", label: "Máquina" },
  { value: "cables", label: "Cables" },
  { value: "bodyweight", label: "Peso corporal" },
  { value: "kettlebell", label: "Kettlebell" },
  { value: "bands", label: "Bandas" },
  { value: "cardio_machine", label: "Máquina cardio" },
] as const;

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string; color: string }[] = [
  { value: "beginner", label: "Principiante", color: "bg-emerald-500" },
  { value: "intermediate", label: "Intermedio", color: "bg-amber-500" },
  { value: "advanced", label: "Avanzado", color: "bg-orange-500" },
  { value: "expert", label: "Experto", color: "bg-red-500" },
];

interface ExerciseFormProps {
  exercise?: Exercise;
  onClose: () => void;
  onSaved: () => void;
}

export function ExerciseForm({ exercise, onClose, onSaved }: ExerciseFormProps): React.ReactNode {
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, control, formState: { errors, isSubmitting } } =
    useForm<CreateExerciseInput>({
      resolver: zodResolver(createExerciseSchema),
      defaultValues: {
        name: exercise?.name ?? "",
        description: exercise?.description ?? "",
        video_url: exercise?.video_url ?? "",
        muscle_group: exercise?.muscle_group ?? "",
        equipment: exercise?.equipment ?? "",
        difficulty: exercise?.difficulty ?? "beginner",
        is_timed: exercise?.is_timed ?? false,
        duration_seconds: exercise?.duration_seconds ?? undefined,
      },
    });

  const isTimed = watch("is_timed");
  const selectedMuscle = watch("muscle_group");
  const selectedEquipment = watch("equipment");
  const selectedDifficulty = watch("difficulty");

  async function onSubmit(data: CreateExerciseInput): Promise<void> {
    setServerError(null);
    const result = exercise
      ? await editExercise(exercise.id, data)
      : await createExercise(data);

    if (result.success) {
      onSaved();
    } else {
      const msg = typeof result.error === "string"
        ? result.error
        : JSON.stringify(result.error);
      setServerError(msg);
    }
  }

  return (
    // Overlay oscuro que cierra al hacer click fuera
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {exercise ? "Editar ejercicio" : "Nuevo ejercicio"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-5">
          {/* Inputs ocultos para registrar los campos controlados via setValue con RHF —
              sin esto, handleSubmit no los incluye en el payload y Zod falla */}
          <input type="hidden" {...register("difficulty")} />
          <input type="hidden" {...register("muscle_group")} />
          <input type="hidden" {...register("equipment")} />

          {serverError && (
            <div className="px-3 py-2 rounded-md text-sm bg-red-50 text-red-700 border border-red-200">
              {serverError}
            </div>
          )}

          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="ex-name">Nombre del ejercicio</Label>
            <Input id="ex-name" placeholder="ej: Press de banca" {...register("name")} />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>

          {/* Grupo muscular — chips de selección */}
          <div className="space-y-1.5">
            <Label>Grupo muscular</Label>
            <div className="flex flex-wrap gap-2">
              {MUSCLE_GROUPS.map((mg) => (
                <button
                  key={mg.value}
                  type="button"
                  onClick={() => setValue("muscle_group", selectedMuscle === mg.value ? "" : mg.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    selectedMuscle === mg.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-transparent hover:border-border"
                  }`}
                >
                  {mg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Equipamiento */}
          <div className="space-y-1.5">
            <Label>Equipamiento</Label>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map((eq) => (
                <button
                  key={eq.value}
                  type="button"
                  onClick={() => setValue("equipment", selectedEquipment === eq.value ? "" : eq.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    selectedEquipment === eq.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-transparent hover:border-border"
                  }`}
                >
                  {eq.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dificultad — botones visuales */}
          <div className="space-y-1.5">
            <Label>Dificultad</Label>
            <div className="grid grid-cols-4 gap-2">
              {DIFFICULTY_OPTIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setValue("difficulty", d.value)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all border-2 ${
                    selectedDifficulty === d.value
                      ? "border-primary text-foreground"
                      : "border-transparent bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <span className={`inline-block w-2 h-2 rounded-full ${d.color} mr-1.5`} />
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tipo: Repeticiones vs Tiempo */}
          <div className="space-y-1.5">
            <Label>Tipo de ejercicio</Label>
            <Controller
              name="is_timed"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => field.onChange(false)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                      !field.value
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-transparent bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    <Repeat className="w-4 h-4" />
                    Repeticiones
                  </button>
                  <button
                    type="button"
                    onClick={() => field.onChange(true)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                      field.value
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-transparent bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    <Timer className="w-4 h-4" />
                    Tiempo
                  </button>
                </div>
              )}
            />
          </div>

          {/* Duración en segundos — solo visible si is_timed */}
          {isTimed && (
            <div className="space-y-1.5">
              <Label htmlFor="ex-duration">Duración objetivo (segundos)</Label>
              <Input
                id="ex-duration"
                type="number"
                placeholder="ej: 60"
                {...register("duration_seconds", { valueAsNumber: true })}
              />
              {errors.duration_seconds && (
                <p className="text-xs text-red-600">{errors.duration_seconds.message}</p>
              )}
            </div>
          )}

          {/* URL de video */}
          <div className="space-y-1.5">
            <Label htmlFor="ex-video">URL de video (opcional)</Label>
            <Input
              id="ex-video"
              type="url"
              placeholder="https://youtube.com/..."
              {...register("video_url")}
            />
            {errors.video_url && <p className="text-xs text-red-600">{errors.video_url.message}</p>}
          </div>

          {/* Descripción / notas */}
          <div className="space-y-1.5">
            <Label htmlFor="ex-description">Descripción / Notas</Label>
            <textarea
              id="ex-description"
              rows={3}
              placeholder="Instrucciones, variaciones, consejos..."
              {...register("description")}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Acciones */}
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={isSubmitting} className="flex-1 gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {exercise ? "Guardar cambios" : "Crear ejercicio"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
