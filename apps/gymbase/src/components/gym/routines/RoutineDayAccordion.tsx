// RoutineDayAccordion.tsx — Día de rutina expandible con lista de ejercicios, series y descanso

"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { RoutineDay, RoutineExercise } from "@/types/gym-routines";

interface DayWithExercises extends RoutineDay {
  exercises: RoutineExercise[];
}

interface RoutineDayAccordionProps {
  day: DayWithExercises;
}

export function RoutineDayAccordion({ day }: RoutineDayAccordionProps): React.ReactNode {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {/* Header del día — toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#0f0f0f] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-barlow shrink-0"
            style={{ backgroundColor: "#FF5E1420", color: "#FF5E14" }}
          >
            {day.day_number}
          </span>
          <div className="text-left">
            <p className="text-[12px] font-medium text-[#ccc]">
              {day.name ?? `Día ${day.day_number}`}
            </p>
            <p className="text-[10px] text-[#444]">
              {day.exercises.length} ejercicio{day.exercises.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {open
          ? <ChevronDown className="w-3.5 h-3.5 text-[#555]" />
          : <ChevronRight className="w-3.5 h-3.5 text-[#555]" />
        }
      </button>

      {/* Lista de ejercicios del día */}
      {open && (
        <div className="bg-[#0d0d0d] divide-y divide-[#111]">
          {day.exercises.length === 0 ? (
            <p className="px-4 py-3 text-[11px] text-[#444]">Sin ejercicios en este día</p>
          ) : (
            [...day.exercises]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((ex) => (
                <div key={ex.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[12px] text-[#ccc] truncate">
                      {ex.exercise?.name ?? "Ejercicio"}
                    </p>
                    {ex.exercise?.muscle_group && (
                      <p className="text-[9px] text-[#444] mt-0.5 capitalize">
                        {ex.exercise.muscle_group.replace("_", " ")}
                      </p>
                    )}
                  </div>
                  {/* Series × reps y descanso */}
                  {ex.sets != null && (
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-[12px] font-semibold font-barlow text-[#FF5E14]">
                        {ex.sets}×{ex.reps ?? "—"}
                      </p>
                      {ex.rest_seconds != null && (
                        <p className="text-[9px] text-[#444]">{ex.rest_seconds}s descanso</p>
                      )}
                    </div>
                  )}
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
}
