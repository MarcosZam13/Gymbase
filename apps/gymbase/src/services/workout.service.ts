// workout.service.ts — Queries de base de datos para registro y consulta de entrenamientos

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkoutLog } from "@/types/gym-routines";

// Registra un entrenamiento completado por un miembro
export async function insertWorkoutLog(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  data: {
    routine_day_id: string;
    duration_minutes?: number;
    exercises_done?: Record<string, unknown>;
  }
): Promise<WorkoutLog> {
  const { data: log, error } = await supabase
    .from("gym_workout_logs")
    .insert({
      user_id: userId,
      org_id: orgId,
      routine_day_id: data.routine_day_id,
      duration_minutes: data.duration_minutes ?? null,
      exercises_done: data.exercises_done ?? null,
    })
    .select("id, user_id, org_id, routine_day_id, completed_at, duration_minutes, exercises_done")
    .single();

  if (error) throw new Error(error.message);
  return log as WorkoutLog;
}

// Obtiene el historial de entrenamientos de un usuario
export async function fetchWorkoutLogs(
  supabase: SupabaseClient,
  userId: string,
  limit?: number
): Promise<WorkoutLog[]> {
  let query = supabase
    .from("gym_workout_logs")
    .select("id, user_id, org_id, routine_day_id, completed_at, duration_minutes, exercises_done")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as WorkoutLog[];
}
