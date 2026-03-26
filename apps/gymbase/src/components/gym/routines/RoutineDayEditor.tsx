// RoutineDayEditor.tsx — Editor de ejercicios dentro de un día de rutina

"use client";

import { useState } from "react";
import { Plus, Trash2, Loader2, GripVertical } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { Label } from "@core/components/ui/label";
import { addExercise, removeExerciseAction } from "@/actions/routine.actions";
import type { RoutineDay, RoutineExercise, Exercise } from "@/types/gym-routines";

interface RoutineDayEditorProps {
  day: RoutineDay & { exercises: RoutineExercise[] };
  exercises: Exercise[];
}

export function RoutineDayEditor({ day, exercises }: RoutineDayEditorProps): React.ReactNode {
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState("");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("12");
  const [rest, setRest] = useState("60");

  async function handleAdd(): Promise<void> {
    if (!selectedExercise) return;
    setIsAdding(true);
    await addExercise(day.id, {
      exercise_id: selectedExercise,
      sets: parseInt(sets) || 3,
      reps,
      rest_seconds: parseInt(rest) || 60,
    });
    setSelectedExercise("");
    setIsAdding(false);
  }

  async function handleRemove(id: string): Promise<void> {
    setRemovingId(id);
    await removeExerciseAction(id);
    setRemovingId(null);
  }

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <h4 className="font-medium text-sm">Día {day.day_number}{day.name ? ` — ${day.name}` : ""}</h4>

      {/* Lista de ejercicios actuales */}
      {day.exercises.length > 0 ? (
        <div className="space-y-2">
          {day.exercises.sort((a, b) => a.sort_order - b.sort_order).map((re) => (
            <div key={re.id} className="flex items-center justify-between bg-surface rounded-md px-3 py-2">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{re.exercise?.name ?? "Ejercicio"}</p>
                  <p className="text-xs text-muted-foreground">
                    {re.sets && `${re.sets} series`}{re.reps && ` × ${re.reps}`}{re.rest_seconds && ` · ${re.rest_seconds}s descanso`}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleRemove(re.id)} disabled={removingId === re.id}>
                {removingId === re.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-red-500" />}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Sin ejercicios aún.</p>
      )}

      {/* Agregar ejercicio */}
      <div className="border-t border-border pt-3 space-y-2">
        <Label className="text-xs">Agregar ejercicio</Label>
        <select
          value={selectedExercise}
          onChange={(e) => setSelectedExercise(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="">Seleccionar...</option>
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>{ex.name} ({ex.muscle_group ?? "General"})</option>
          ))}
        </select>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Series</Label>
            <Input type="number" value={sets} onChange={(e) => setSets(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Reps</Label>
            <Input value={reps} onChange={(e) => setReps(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Descanso (s)</Label>
            <Input type="number" value={rest} onChange={(e) => setRest(e.target.value)} />
          </div>
        </div>
        <Button size="sm" onClick={handleAdd} disabled={!selectedExercise || isAdding} className="gap-1">
          {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Agregar
        </Button>
      </div>
    </div>
  );
}
