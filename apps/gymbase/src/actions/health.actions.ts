// health.actions.ts — Server actions para métricas de salud, snapshots y fotos de progreso

"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser, getOrgId } from "@/lib/supabase/server";
import { GYM_STORAGE_BUCKETS } from "@/lib/constants";
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

// Sube una foto de progreso al storage y registra en DB
// Admin/trainer puede subir para cualquier memberId; miembros solo para sí mismos
export async function uploadProgressPhoto(
  formData: FormData
): Promise<ActionResult<ProgressPhoto>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const file = formData.get("file") as File | null;
  const memberIdRaw = formData.get("memberId") as string | null;
  const photoType = formData.get("photoType") as "front" | "side" | "back" | null;
  const notes = formData.get("notes") as string | null;

  // Si se pasa un memberId ajeno, solo admin/trainer puede hacerlo
  const isAdminOrTrainer = ["admin", "trainer"].includes(user.role);
  if (memberIdRaw && memberIdRaw !== user.id && !isAdminOrTrainer) {
    return { success: false, error: "Sin permisos" };
  }

  // Usar memberId de la request si es admin, o el propio user.id para miembros
  const targetId = memberIdRaw ?? user.id;

  if (!file || !photoType) {
    return { success: false, error: "Faltan datos requeridos" };
  }

  if (!["front", "side", "back"].includes(photoType)) {
    return { success: false, error: "Tipo de foto inválido" };
  }

  // Validar tamaño (máx 5MB) y tipo MIME antes de subir
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "La foto no puede superar 5MB" };
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { success: false, error: "Solo se aceptan JPG, PNG o WebP" };
  }

  const supabase = await createClient();
  const orgId = await getOrgId();

  try {
    // Construir la ruta: {orgId}/{targetId}/{tipo}-{timestamp}.ext
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${orgId}/${targetId}/${photoType}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(GYM_STORAGE_BUCKETS.PROGRESS_PHOTOS)
      .upload(path, file, { upsert: false });

    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = supabase.storage
      .from(GYM_STORAGE_BUCKETS.PROGRESS_PHOTOS)
      .getPublicUrl(path);

    // Insertar registro en DB con URL pública y metadata
    const { data: photo, error: dbError } = await supabase
      .from("gym_progress_photos")
      .insert({
        user_id: targetId,
        org_id: orgId,
        photo_url: urlData.publicUrl,
        photo_type: photoType,
        notes: notes ?? null,
        taken_at: new Date().toISOString(),
      })
      .select("id, user_id, org_id, photo_url, photo_type, notes, taken_at, created_at")
      .single();

    if (dbError) throw new Error(dbError.message);

    // Revalidar la ruta del perfil del admin y del portal según el contexto
    revalidatePath(`/admin/members/${targetId}`);
    revalidatePath("/portal/profile");
    return { success: true, data: photo as ProgressPhoto };
  } catch (error) {
    console.error("[uploadProgressPhoto] Error:", error);
    return { success: false, error: "Error al subir la foto" };
  }
}
