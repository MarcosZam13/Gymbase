// health.service.ts — Queries de base de datos para métricas de salud y progreso

import type { SupabaseClient } from "@supabase/supabase-js";
import type { HealthProfile, HealthSnapshot, ProgressPhoto } from "@/types/gym-health";
import type { HealthProfileInput } from "@/lib/validations/health";

const HEALTH_PROFILE_COLUMNS =
  "id, user_id, org_id, height_cm, weight_kg, body_fat_pct, muscle_mass_kg, bmi, resting_heart_rate, blood_pressure, fitness_level, injuries_notes, goals, trainer_notes, medical_conditions, measured_at, updated_at";

const HEALTH_SNAPSHOT_COLUMNS =
  "id, user_id, org_id, weight_kg, body_fat_pct, muscle_mass_kg, notes, recorded_by, recorded_at";

const PROGRESS_PHOTO_COLUMNS =
  "id, user_id, org_id, photo_url, photo_type, notes, taken_at, created_at";

// Obtiene el perfil de salud de un usuario
export async function fetchHealthProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<HealthProfile | null> {
  const { data, error } = await supabase
    .from("gym_health_profiles")
    .select(HEALTH_PROFILE_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as HealthProfile | null;
}

// Crea o actualiza el perfil de salud de un usuario
export async function upsertHealthProfile(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  data: Omit<HealthProfileInput, "user_id">
): Promise<HealthProfile> {
  // Calcular BMI si se proporcionan altura y peso
  let bmi: number | null = null;
  if (data.height_cm && data.weight_kg) {
    const heightM = data.height_cm / 100;
    bmi = Math.round((data.weight_kg / (heightM * heightM)) * 10) / 10;
  }

  const { data: result, error } = await supabase
    .from("gym_health_profiles")
    .upsert(
      {
        user_id: userId,
        org_id: orgId,
        ...data,
        bmi,
        measured_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select(HEALTH_PROFILE_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return result as HealthProfile;
}

// Obtiene el historial de snapshots de un usuario ordenados por fecha descendente
export async function fetchHealthSnapshots(
  supabase: SupabaseClient,
  userId: string,
  limit?: number
): Promise<HealthSnapshot[]> {
  let query = supabase
    .from("gym_health_snapshots")
    .select(HEALTH_SNAPSHOT_COLUMNS)
    .eq("user_id", userId)
    .order("recorded_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as HealthSnapshot[];
}

// Inserta un nuevo snapshot de métricas de salud
export async function insertHealthSnapshot(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  recordedBy: string,
  data: { weight_kg: number; body_fat_pct?: number | null; muscle_mass_kg?: number | null; notes?: string | null }
): Promise<HealthSnapshot> {
  const { data: result, error } = await supabase
    .from("gym_health_snapshots")
    .insert({
      user_id: userId,
      org_id: orgId,
      recorded_by: recordedBy,
      weight_kg: data.weight_kg,
      body_fat_pct: data.body_fat_pct ?? null,
      muscle_mass_kg: data.muscle_mass_kg ?? null,
      notes: data.notes ?? null,
    })
    .select(HEALTH_SNAPSHOT_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return result as HealthSnapshot;
}

// Obtiene las fotos de progreso de un usuario ordenadas por fecha descendente
export async function fetchProgressPhotos(
  supabase: SupabaseClient,
  userId: string
): Promise<ProgressPhoto[]> {
  const { data, error } = await supabase
    .from("gym_progress_photos")
    .select(PROGRESS_PHOTO_COLUMNS)
    .eq("user_id", userId)
    .order("taken_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ProgressPhoto[];
}
