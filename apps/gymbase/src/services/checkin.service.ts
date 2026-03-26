// checkin.service.ts — Queries de base de datos para check-in y asistencia

import type { SupabaseClient } from "@supabase/supabase-js";
import type { QRCode, AttendanceLog, AttendanceLogWithProfile } from "@/types/gym-checkin";

// Obtiene el QR activo de un usuario
export async function fetchUserQR(
  supabase: SupabaseClient,
  userId: string
): Promise<QRCode | null> {
  const { data, error } = await supabase
    .from("gym_qr_codes")
    .select("id, user_id, org_id, qr_code, is_active, created_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as QRCode | null;
}

// Genera un nuevo QR para un miembro (desactiva los anteriores)
export async function generateQRCode(
  supabase: SupabaseClient,
  userId: string,
  orgId: string
): Promise<QRCode> {
  // Desactivar QRs previos
  await supabase
    .from("gym_qr_codes")
    .update({ is_active: false })
    .eq("user_id", userId);

  // Generar código único basado en UUID + timestamp
  const qrCode = `GYM-${crypto.randomUUID()}-${Date.now()}`;

  const { data, error } = await supabase
    .from("gym_qr_codes")
    .insert({ user_id: userId, org_id: orgId, qr_code: qrCode })
    .select("id, user_id, org_id, qr_code, is_active, created_at")
    .single();

  if (error) throw new Error(error.message);
  return data as QRCode;
}

// Busca un QR activo por su código (para el escáner)
export async function findQRByCode(
  supabase: SupabaseClient,
  qrCode: string
): Promise<QRCode | null> {
  const { data, error } = await supabase
    .from("gym_qr_codes")
    .select("id, user_id, org_id, qr_code, is_active, created_at")
    .eq("qr_code", qrCode)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as QRCode | null;
}

// Registra un check-in para un usuario
export async function insertCheckin(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  registeredBy: string | null
): Promise<AttendanceLog> {
  const { data, error } = await supabase
    .from("gym_attendance_logs")
    .insert({
      user_id: userId,
      org_id: orgId,
      registered_by: registeredBy,
    })
    .select("id, user_id, org_id, check_in_at, check_out_at, registered_by, duration_minutes")
    .single();

  if (error) {
    // El índice parcial previene check-ins duplicados abiertos
    if (error.code === "23505") {
      throw new Error("Este usuario ya tiene un check-in activo");
    }
    throw new Error(error.message);
  }
  return data as AttendanceLog;
}

// Registra un check-out (cierra el check-in activo)
export async function performCheckout(
  supabase: SupabaseClient,
  attendanceId: string
): Promise<AttendanceLog> {
  const { data, error } = await supabase
    .from("gym_attendance_logs")
    .update({ check_out_at: new Date().toISOString() })
    .eq("id", attendanceId)
    .is("check_out_at", null)
    .select("id, user_id, org_id, check_in_at, check_out_at, registered_by, duration_minutes")
    .single();

  if (error) throw new Error(error.message);
  return data as AttendanceLog;
}

// Obtiene el check-in abierto de un usuario (si existe)
export async function fetchOpenCheckin(
  supabase: SupabaseClient,
  userId: string
): Promise<AttendanceLog | null> {
  const { data, error } = await supabase
    .from("gym_attendance_logs")
    .select("id, user_id, org_id, check_in_at, check_out_at, registered_by, duration_minutes")
    .eq("user_id", userId)
    .is("check_out_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as AttendanceLog | null;
}

// Obtiene la cantidad de personas actualmente en el gym
export async function fetchCurrentOccupancy(
  supabase: SupabaseClient,
  orgId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("gym_attendance_logs")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId)
    .is("check_out_at", null);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

// Obtiene el historial de asistencia con datos del perfil (para admin)
export async function fetchAttendanceLogs(
  supabase: SupabaseClient,
  orgId: string,
  options: { limit?: number; today?: boolean } = {}
): Promise<AttendanceLogWithProfile[]> {
  let query = supabase
    .from("gym_attendance_logs")
    .select(`
      id, user_id, org_id, check_in_at, check_out_at, registered_by, duration_minutes,
      profile:profiles!gym_attendance_logs_user_id_fkey(full_name, email, avatar_url)
    `)
    .eq("org_id", orgId)
    .order("check_in_at", { ascending: false });

  // Filtrar solo los del día actual si se solicita
  if (options.today) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    query = query.gte("check_in_at", startOfDay.toISOString());
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AttendanceLogWithProfile[];
}
