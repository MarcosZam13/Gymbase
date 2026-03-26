// health.ts — Schemas de validación para perfil de salud y snapshots de métricas

import { z } from "zod";

export const healthProfileSchema = z.object({
  user_id: z.string().uuid("ID de usuario inválido"),
  height_cm: z
    .number()
    .min(50, "La altura mínima es 50 cm")
    .max(300, "La altura máxima es 300 cm")
    .optional()
    .nullable(),
  weight_kg: z
    .number()
    .min(20, "El peso mínimo es 20 kg")
    .max(500, "El peso máximo es 500 kg")
    .optional()
    .nullable(),
  body_fat_pct: z
    .number()
    .min(0, "El porcentaje mínimo es 0")
    .max(100, "El porcentaje máximo es 100")
    .optional()
    .nullable(),
  muscle_mass_kg: z
    .number()
    .min(0, "La masa muscular mínima es 0 kg")
    .max(200, "La masa muscular máxima es 200 kg")
    .optional()
    .nullable(),
  resting_heart_rate: z
    .number()
    .int("La frecuencia cardíaca debe ser un entero")
    .min(30, "La frecuencia mínima es 30 bpm")
    .max(250, "La frecuencia máxima es 250 bpm")
    .optional()
    .nullable(),
  blood_pressure: z
    .string()
    .max(20, "Máximo 20 caracteres")
    .optional()
    .nullable(),
  fitness_level: z
    .enum(["beginner", "intermediate", "advanced", "athlete"], {
      error: "Nivel de condición física inválido",
    })
    .optional()
    .nullable(),
  goals: z
    .array(z.string().min(1).max(100))
    .optional()
    .nullable(),
  injuries_notes: z
    .string()
    .max(1000, "Máximo 1000 caracteres")
    .optional()
    .nullable(),
  trainer_notes: z
    .string()
    .max(1000, "Máximo 1000 caracteres")
    .optional()
    .nullable(),
  medical_conditions: z
    .string()
    .max(1000, "Máximo 1000 caracteres")
    .optional()
    .nullable(),
});

export const healthSnapshotSchema = z.object({
  user_id: z.string().uuid("ID de usuario inválido"),
  weight_kg: z
    .number({ error: "El peso es requerido" })
    .positive("El peso debe ser positivo"),
  body_fat_pct: z
    .number()
    .min(0, "El porcentaje mínimo es 0")
    .max(100, "El porcentaje máximo es 100")
    .optional()
    .nullable(),
  muscle_mass_kg: z
    .number()
    .positive("La masa muscular debe ser positiva")
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(500, "Máximo 500 caracteres")
    .optional()
    .nullable(),
});

export type HealthProfileInput = z.infer<typeof healthProfileSchema>;
export type HealthSnapshotInput = z.infer<typeof healthSnapshotSchema>;
