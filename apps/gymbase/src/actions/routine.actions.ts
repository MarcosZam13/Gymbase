// routine.actions.ts — Server actions para CRUD de rutinas y asignación a miembros

"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser, getOrgId } from "@/lib/supabase/server";
import {
  fetchRoutines, fetchRoutineById, insertRoutine, updateRoutine, deleteRoutine,
  addDayToRoutine, addExerciseToDay, updateExerciseInDay, removeExerciseFromDay,
  fetchMemberRoutine, assignRoutineToMember,
} from "@/services/routine.service";
import { createRoutineSchema, assignRoutineSchema, addRoutineExerciseSchema } from "@/lib/validations/routines";
import type { ActionResult } from "@/types/database";
import type { Routine, RoutineWithDays, RoutineDay, RoutineExercise, MemberRoutine } from "@/types/gym-routines";

export async function getRoutines(): Promise<Routine[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    return await fetchRoutines(supabase, orgId);
  } catch (error) {
    console.error("[getRoutines] Error:", error);
    return [];
  }
}

export async function getRoutineById(routineId: string): Promise<RoutineWithDays | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  try {
    return await fetchRoutineById(supabase, routineId);
  } catch (error) {
    console.error("[getRoutineById] Error:", error);
    return null;
  }
}

export async function createRoutine(input: unknown): Promise<ActionResult<Routine>> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { success: false, error: "Sin permisos" };
  const parsed = createRoutineSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const routine = await insertRoutine(supabase, orgId, user.id, parsed.data);
    revalidatePath("/admin/routines");
    return { success: true, data: routine };
  } catch (error) {
    console.error("[createRoutine] Error:", error);
    return { success: false, error: "Error al crear la rutina" };
  }
}

export async function editRoutine(routineId: string, input: unknown): Promise<ActionResult<Routine>> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { success: false, error: "Sin permisos" };
  const parsed = createRoutineSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  try {
    const routine = await updateRoutine(supabase, routineId, parsed.data);
    revalidatePath("/admin/routines");
    revalidatePath(`/admin/routines/${routineId}`);
    return { success: true, data: routine };
  } catch (error) {
    console.error("[editRoutine] Error:", error);
    return { success: false, error: "Error al actualizar la rutina" };
  }
}

export async function removeRoutine(routineId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { success: false, error: "Sin permisos" };
  const supabase = await createClient();
  try {
    await deleteRoutine(supabase, routineId);
    revalidatePath("/admin/routines");
    return { success: true };
  } catch (error) {
    console.error("[removeRoutine] Error:", error);
    return { success: false, error: "Error al eliminar la rutina" };
  }
}

export async function addDay(routineId: string, dayNumber: number, name?: string): Promise<ActionResult<RoutineDay>> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { success: false, error: "Sin permisos" };
  const supabase = await createClient();
  try {
    const day = await addDayToRoutine(supabase, routineId, dayNumber, name);
    revalidatePath(`/admin/routines/${routineId}`);
    return { success: true, data: day };
  } catch (error) {
    console.error("[addDay] Error:", error);
    return { success: false, error: "Error al agregar el día" };
  }
}

export async function addExercise(dayId: string, input: unknown): Promise<ActionResult<RoutineExercise>> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { success: false, error: "Sin permisos" };
  const parsed = addRoutineExerciseSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  try {
    const { exercise_id, ...rest } = parsed.data;
    const exercise = await addExerciseToDay(supabase, dayId, exercise_id, rest);
    // Revalidar tanto la lista como el editor específico de la rutina
    revalidatePath("/admin/routines", "layout");
    return { success: true, data: exercise };
  } catch (error) {
    console.error("[addExercise] Error:", error);
    return { success: false, error: "Error al agregar el ejercicio" };
  }
}

export async function updateExerciseParams(
  routineExerciseId: string,
  data: { sets?: number | null; reps?: string | null; rest_seconds?: number | null },
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { success: false, error: "Sin permisos" };
  const supabase = await createClient();
  try {
    await updateExerciseInDay(supabase, routineExerciseId, data);
    return { success: true };
  } catch (error) {
    console.error("[updateExerciseParams] Error:", error);
    return { success: false, error: "Error al actualizar el ejercicio" };
  }
}

export async function removeExerciseAction(routineExerciseId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { success: false, error: "Sin permisos" };
  const supabase = await createClient();
  try {
    await removeExerciseFromDay(supabase, routineExerciseId);
    revalidatePath("/admin/routines", "layout");
    return { success: true };
  } catch (error) {
    console.error("[removeExerciseAction] Error:", error);
    return { success: false, error: "Error al eliminar el ejercicio" };
  }
}

export async function getMyRoutine(): Promise<MemberRoutine | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  try {
    return await fetchMemberRoutine(supabase, user.id);
  } catch (error) {
    console.error("[getMyRoutine] Error:", error);
    return null;
  }
}

export async function assignRoutine(input: unknown): Promise<ActionResult<MemberRoutine>> {
  const user = await getCurrentUser();
  if (!user || !["admin", "trainer"].includes(user.role)) return { success: false, error: "Sin permisos" };
  const parsed = assignRoutineSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const assignment = await assignRoutineToMember(supabase, parsed.data.user_id, orgId, parsed.data.routine_id, user.id);
    revalidatePath(`/admin/members/${parsed.data.user_id}`);
    revalidatePath("/portal/routines");
    return { success: true, data: assignment };
  } catch (error) {
    console.error("[assignRoutine] Error:", error);
    return { success: false, error: "Error al asignar la rutina" };
  }
}
