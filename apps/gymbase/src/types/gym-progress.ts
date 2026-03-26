// gym-progress.ts — Tipos para el módulo de seguimiento de progreso

import type { HealthSnapshot, ProgressPhoto } from "./gym-health";

export interface ProgressChartData {
  date: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
}

export interface ProgressMilestone {
  id: string;
  label: string;
  value: number;
  unit: string;
  achieved_at: string;
}

export type { HealthSnapshot, ProgressPhoto };
