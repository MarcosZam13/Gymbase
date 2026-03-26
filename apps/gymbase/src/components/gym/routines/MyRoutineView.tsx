// MyRoutineView.tsx — Vista de la rutina asignada al miembro con tarjetas por día y ejercicio

"use client";

import { useState } from "react";
import { Dumbbell, Calendar, Clock, CheckCircle2, Circle, Timer, Repeat } from "lucide-react";
import type { MemberRoutine, RoutineWithDays } from "@/types/gym-routines";

const MUSCLE_LABELS: Record<string, string> = {
  chest: "Pecho", back: "Espalda", shoulders: "Hombros",
  biceps: "Bíceps", triceps: "Tríceps", legs: "Piernas",
  core: "Core", cardio: "Cardio", full_body: "Cuerpo completo",
};

interface MyRoutineViewProps {
  memberRoutine: MemberRoutine;
  routineDetail: RoutineWithDays | null;
}

export function MyRoutineView({ memberRoutine, routineDetail }: MyRoutineViewProps): React.ReactNode {
  if (!routineDetail) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <p className="text-muted-foreground">No se pudo cargar el detalle de tu rutina.</p>
      </div>
    );
  }

  const sortedDays = [...routineDetail.days].sort((a, b) => a.day_number - b.day_number);
  const [activeDayId, setActiveDayId] = useState(sortedDays[0]?.id ?? "");

  const totalExercises = sortedDays.reduce((sum, d) => sum + d.exercises.length, 0);
  const currentDay = sortedDays.find((d) => d.id === activeDayId);

  // Dots de progreso semanal basados en days_per_week
  const weekDots = Array.from({ length: routineDetail.days_per_week ?? sortedDays.length });

  return (
    <div className="space-y-4">

      {/* Cabecera de la rutina */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-lg leading-tight">{routineDetail.name}</h2>
              {routineDetail.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{routineDetail.description}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                {routineDetail.days_per_week && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {routineDetail.days_per_week} días/semana
                  </span>
                )}
                {routineDetail.duration_weeks && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {routineDetail.duration_weeks} semanas
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Dumbbell className="w-3.5 h-3.5" />
                  {totalExercises} ejercicios
                </span>
              </div>
            </div>
          </div>

          {/* Badge activa */}
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-600 font-medium flex-shrink-0">
            Activa
          </span>
        </div>

        {/* Puntos de progreso semanal */}
        {weekDots.length > 0 && (
          <div className="mt-4 flex gap-2">
            {weekDots.map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  i === 0 ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Selector de días */}
      {sortedDays.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {sortedDays.map((day) => (
            <button
              key={day.id}
              onClick={() => setActiveDayId(day.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                activeDayId === day.id
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {day.name ? day.name : `Día ${day.day_number}`}
            </button>
          ))}
        </div>
      )}

      {/* Ejercicios del día activo */}
      {currentDay && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Header del día */}
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">
                {currentDay.name ?? `Día ${currentDay.day_number}`}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentDay.exercises.length} ejercicio{currentDay.exercises.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Lista de ejercicios */}
          {currentDay.exercises.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-muted-foreground">Sin ejercicios en este día.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {[...currentDay.exercises]
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((re, i) => {
                  const isTimed = re.exercise?.is_timed;
                  return (
                    <div key={re.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
                      {/* Número */}
                      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                        {i + 1}
                      </div>

                      {/* Info del ejercicio */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm">{re.exercise?.name ?? "Ejercicio"}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {/* Sets × reps / tiempo */}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            {isTimed ? (
                              <><Timer className="w-3 h-3" />{re.sets} series × {re.exercise?.duration_seconds ?? "—"}s</>
                            ) : (
                              <><Repeat className="w-3 h-3" />{re.sets ?? "—"} × {re.reps ?? "—"} reps</>
                            )}
                          </span>
                          {/* Descanso */}
                          {re.rest_seconds && (
                            <span className="text-xs text-sky-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {re.rest_seconds}s
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Músculo */}
                      {re.exercise?.muscle_group && (
                        <span className="px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground flex-shrink-0">
                          {MUSCLE_LABELS[re.exercise.muscle_group] ?? re.exercise.muscle_group}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Empty state si no hay días */}
      {sortedDays.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">Esta rutina aún no tiene días configurados.</p>
        </div>
      )}
    </div>
  );
}
