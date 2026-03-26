// workout.actions.ts — Server actions para registro y consulta de entrenamientos

"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser, getOrgId } from "@/lib/supabase/server";
import { insertWorkoutLog, fetchWorkoutLogs } from "@/services/workout.service";
import { logWorkoutSchema } from "@/lib/validations/routines";
import type { ActionResult } from "@/types/database";
import type { WorkoutLog } from "@/types/gym-routines";

export async function logWorkout(input: unknown): Promise<ActionResult<WorkoutLog>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  const parsed = logWorkoutSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const log = await insertWorkoutLog(supabase, user.id, orgId, parsed.data);
    revalidatePath("/portal/routines");
    revalidatePath("/portal/progress");
    return { success: true, data: log };
  } catch (error) {
    console.error("[logWorkout] Error:", error);
    return { success: false, error: "Error al registrar el entrenamiento" };
  }
}

export async function getMyWorkoutLogs(limit?: number): Promise<WorkoutLog[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  try {
    return await fetchWorkoutLogs(supabase, user.id, limit);
  } catch (error) {
    console.error("[getMyWorkoutLogs] Error:", error);
    return [];
  }
}
