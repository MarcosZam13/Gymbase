// gym-health.ts — Tipos para el módulo de métricas de salud y progreso físico

export type FitnessLevel = "beginner" | "intermediate" | "advanced" | "athlete";

export type PhotoType = "front" | "side" | "back";

export interface HealthProfile {
  id: string;
  user_id: string;
  org_id: string;
  height_cm: number | null;
  weight_kg: number | null;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  bmi: number | null;
  resting_heart_rate: number | null;
  blood_pressure: string | null;
  fitness_level: FitnessLevel | null;
  injuries_notes: string | null;
  goals: string[] | null;
  trainer_notes: string | null;
  medical_conditions: string | null;
  measured_at: string | null;
  updated_at: string;
}

export interface HealthSnapshot {
  id: string;
  user_id: string;
  org_id: string;
  weight_kg: number;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  notes: string | null;
  recorded_by: string | null;
  recorded_at: string;
}

export interface ProgressPhoto {
  id: string;
  user_id: string;
  org_id: string;
  photo_url: string;
  photo_type: PhotoType;
  notes: string | null;
  taken_at: string;
  created_at: string;
}
