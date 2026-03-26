// health.actions.ts — Server actions para métricas de salud, snapshots y fotos de progreso

"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser, getOrgId } from "@/lib/supabase/server";
import {
  fetchHealthProfile,
  upsertHealthProfile,
  fetchHealthSnapshots,
  insertHealthSnapshot,
  fetchProgressPhotos,
} from "@/services/health.service";
import { healthProfileSchema, healthSnapshotSchema } from "@/lib/validations/health";
import type { ActionResult } from "@/types/database";
import type { HealthProfile, HealthSnapshot, ProgressPhoto } from "@/types/gym-health";

// Obtiene el perfil de salud: si se pasa userId requiere rol admin/trainer, si no obtiene el propio
export async function getHealthProfile(
  userId?: string
): Promise<HealthProfile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  // Si se solicita el perfil de otro usuario, verificar permisos
  if (userId && userId !== user.id) {
    if (!["admin", "trainer"].includes(user.role)) return null;
  }

  const targetId = userId ?? user.id;
  const supabase = await createClient();

  try {
    return await fetchHealthProfile(supabase, targetId);
  } catch (error) {
    console.error("[getHealthProfile] Error:", error);
    return null;
  }
}

// Crea o actualiza el perfil de salud de un miembro (solo admin/trainer)
export async function updateHealthProfile(
  input: unknown
): Promise<ActionResult<HealthProfile>> {
  const user = await getCurrentUser();
  if (!user || !["admin", "trainer"].includes(user.role)) {
    return { success: false, error: "Sin permisos" };
  }

  const parsed = healthProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const { user_id, ...profileData } = parsed.data;
  const supabase = await createClient();

  try {
    const orgId = await getOrgId();
    const profile = await upsertHealthProfile(supabase, user_id, orgId, profileData);
    revalidatePath(`/admin/members/${user_id}`);
    revalidatePath("/portal/dashboard");
    return { success: true, data: profile };
  } catch (error) {
    console.error("[updateHealthProfile] Error:", error);
    return { success: false, error: "Error al actualizar el perfil de salud" };
  }
}

// Agrega un snapshot de métricas: admin/trainer puede para cualquier usuario, miembro solo el suyo
export async function addHealthSnapshot(
  input: unknown
): Promise<ActionResult<HealthSnapshot>> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "No autenticado" };
  }

  const parsed = healthSnapshotSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const { user_id, ...snapshotData } = parsed.data;

  // Un miembro solo puede agregar snapshots para sí mismo
  if (user_id !== user.id && !["admin", "trainer"].includes(user.role)) {
    return { success: false, error: "Sin permisos para registrar métricas de otro usuario" };
  }

  const supabase = await createClient();

  try {
    const orgId = await getOrgId();
    const snapshot = await insertHealthSnapshot(supabase, user_id, orgId, user.id, snapshotData);
    revalidatePath(`/admin/members/${user_id}`);
    revalidatePath("/portal/dashboard");
    return { success: true, data: snapshot };
  } catch (error) {
    console.error("[addHealthSnapshot] Error:", error);
    return { success: false, error: "Error al registrar el snapshot de salud" };
  }
}

// Obtiene el historial de snapshots: admin/trainer puede ver de cualquier usuario
export async function getHealthHistory(
  userId?: string,
  limit?: number
): Promise<HealthSnapshot[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  // Si se solicita el historial de otro usuario, verificar permisos
  if (userId && userId !== user.id) {
    if (!["admin", "trainer"].includes(user.role)) return [];
  }

  const targetId = userId ?? user.id;
  const supabase = await createClient();

  try {
    return await fetchHealthSnapshots(supabase, targetId, limit);
  } catch (error) {
    console.error("[getHealthHistory] Error:", error);
    return [];
  }
}

// Obtiene las fotos de progreso: admin/trainer puede ver de cualquier usuario
export async function getProgressPhotos(
  userId?: string
): Promise<ProgressPhoto[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  // Si se solicitan fotos de otro usuario, verificar permisos
  if (userId && userId !== user.id) {
    if (!["admin", "trainer"].includes(user.role)) return [];
  }

  const targetId = userId ?? user.id;
  const supabase = await createClient();

  try {
    return await fetchProgressPhotos(supabase, targetId);
  } catch (error) {
    console.error("[getProgressPhotos] Error:", error);
    return [];
  }
}
