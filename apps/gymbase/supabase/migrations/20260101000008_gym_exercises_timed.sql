-- 20260101000008_gym_exercises_timed.sql — Agrega soporte para ejercicios cronometrados en gym_exercises

-- Algunos ejercicios se miden por tiempo (planchas, cardio) en lugar de repeticiones.
-- is_timed indica el modo, duration_seconds guarda el tiempo objetivo.
ALTER TABLE gym_exercises
  ADD COLUMN IF NOT EXISTS is_timed       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duration_seconds integer CHECK (duration_seconds IS NULL OR duration_seconds > 0);
