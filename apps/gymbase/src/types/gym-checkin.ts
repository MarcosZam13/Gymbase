// gym-checkin.ts — Tipos para el módulo de QR check-in y control de asistencia

export interface QRCode {
  id: string;
  user_id: string;
  org_id: string;
  qr_code: string;
  is_active: boolean;
  created_at: string;
}

export interface AttendanceLog {
  id: string;
  user_id: string;
  org_id: string;
  check_in_at: string;
  check_out_at: string | null;
  registered_by: string | null;
  duration_minutes: number | null;
}

export interface AttendanceLogWithProfile extends AttendanceLog {
  profile: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

export type OccupancyLevel = "free" | "moderate" | "busy" | "full";

export interface OccupancyData {
  current: number;
  capacity: number;
  level: OccupancyLevel;
  percentage: number;
}
