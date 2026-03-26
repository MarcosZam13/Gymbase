// exercise.actions.ts — Server actions para CRUD de ejercicios

"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser, getOrgId } from "@/lib/supabase/server";
import { fetchExercises, insertExercise, updateExercise, deleteExercise } from "@/services/exercise.service";
import { createExerciseSchema } from "@/lib/validations/routines";
import type { ActionResult } from "@/types/database";
import type { Exercise } from "@/types/gym-routines";

export async function getExercises(filters?: { muscle_group?: string; difficulty?: string }): Promise<Exercise[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    return await fetchExercises(supabase, orgId, filters);
  } catch (error) {
    console.error("[getExercises] Error:", error);
    return [];
  }
}

export async function createExercise(input: unknown): Promise<ActionResult<Exercise>> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { success: false, error: "Sin permisos" };
  const parsed = createExerciseSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const exercise = await insertExercise(supabase, orgId, parsed.data);
    revalidatePath("/admin/routines");
    return { success: true, data: exercise };
  } catch (error) {
    console.error("[createExercise] Error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error al crear el ejercicio" };
  }
}

export async function editExercise(exerciseId: string, input: unknown): Promise<ActionResult<Exercise>> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { success: false, error: "Sin permisos" };
  const parsed = createExerciseSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  try {
    const exercise = await updateExercise(supabase, exerciseId, parsed.data);
    revalidatePath("/admin/routines");
    return { success: true, data: exercise };
  } catch (error) {
    console.error("[editExercise] Error:", error);
    return { success: false, error: "Error al actualizar el ejercicio" };
  }
}

export async function removeExercise(exerciseId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { success: false, error: "Sin permisos" };
  const supabase = await createClient();
  try {
    await deleteExercise(supabase, exerciseId);
    revalidatePath("/admin/routines");
    return { success: true };
  } catch (error) {
    console.error("[removeExercise] Error:", error);
    return { success: false, error: "Error al eliminar el ejercicio" };
  }
}
