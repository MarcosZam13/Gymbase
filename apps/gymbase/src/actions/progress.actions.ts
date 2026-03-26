// progress.actions.ts — Server actions para consulta de datos de progreso

"use server";

import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { fetchHealthSnapshots, fetchProgressPhotos } from "@/services/health.service";
import type { ProgressChartData } from "@/types/gym-progress";
import type { HealthSnapshot, ProgressPhoto } from "@/types/gym-health";

// Obtiene datos formateados para gráficas de progreso del usuario actual
export async function getProgressChartData(limit?: number): Promise<ProgressChartData[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  try {
    const snapshots = await fetchHealthSnapshots(supabase, user.id, limit);
    // Ordenar cronológicamente para las gráficas
    return snapshots.reverse().map((s) => ({
      date: new Date(s.recorded_at).toLocaleDateString("es-CR", { day: "2-digit", month: "short" }),
      weight_kg: s.weight_kg,
      body_fat_pct: s.body_fat_pct,
      muscle_mass_kg: s.muscle_mass_kg,
    }));
  } catch (error) {
    console.error("[getProgressChartData] Error:", error);
    return [];
  }
}

// Obtiene snapshots recientes del usuario actual
export async function getMySnapshots(limit?: number): Promise<HealthSnapshot[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  try {
    return await fetchHealthSnapshots(supabase, user.id, limit);
  } catch (error) {
    console.error("[getMySnapshots] Error:", error);
    return [];
  }
}

// Obtiene fotos de progreso del usuario actual
export async function getMyProgressPhotos(): Promise<ProgressPhoto[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  try {
    return await fetchProgressPhotos(supabase, user.id);
  } catch (error) {
    console.error("[getMyProgressPhotos] Error:", error);
    return [];
  }
}
