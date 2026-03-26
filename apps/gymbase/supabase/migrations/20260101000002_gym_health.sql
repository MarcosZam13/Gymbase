-- 20260101000002_gym_health.sql — Tablas para métricas de salud y progreso físico
-- Nota: org_id es un UUID simple (viene de GYMBASE_ORG_ID), sin FK a organizations

-- ============================================================
-- TABLA: gym_health_profiles
-- Datos de salud base de cada miembro (actualizable)
-- ============================================================
CREATE TABLE IF NOT EXISTS gym_health_profiles (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id               uuid NOT NULL,
  height_cm            numeric(5,1),
  weight_kg            numeric(5,2),
  body_fat_pct         numeric(4,1),
  muscle_mass_kg       numeric(5,2),
  bmi                  numeric(4,1),
  resting_heart_rate   integer,
  blood_pressure       text,
  fitness_level        text CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced', 'athlete')),
  injuries_notes       text,
  goals                text[],
  trainer_notes        text,
  medical_conditions   text,
  measured_at          timestamptz,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE gym_health_profiles ENABLE ROW LEVEL SECURITY;

-- Solo admin puede ver o modificar perfiles de salud de cualquier miembro
CREATE POLICY "admin_manage_health_profiles" ON gym_health_profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Miembros solo ven su propio perfil de salud
CREATE POLICY "members_see_own_health_profile" ON gym_health_profiles
  FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- TABLA: gym_health_snapshots
-- Historial cronológico de mediciones (peso, grasa, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS gym_health_snapshots (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id           uuid NOT NULL,
  weight_kg        numeric(5,2) NOT NULL,
  body_fat_pct     numeric(4,1),
  muscle_mass_kg   numeric(5,2),
  notes            text,
  recorded_by      uuid REFERENCES auth.users(id),
  recorded_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gym_snapshots_user_date
  ON gym_health_snapshots(user_id, recorded_at DESC);

ALTER TABLE gym_health_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_snapshots" ON gym_health_snapshots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "members_manage_own_snapshots" ON gym_health_snapshots
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- TABLA: gym_progress_photos
-- Fotos de progreso (frente, lado, espalda)
-- ============================================================
CREATE TABLE IF NOT EXISTS gym_progress_photos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id      uuid NOT NULL,
  photo_url   text NOT NULL,
  photo_type  text NOT NULL CHECK (photo_type IN ('front', 'side', 'back')),
  notes       text,
  taken_at    timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gym_progress_photos_user
  ON gym_progress_photos(user_id, taken_at DESC);

ALTER TABLE gym_progress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_photos" ON gym_progress_photos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "members_manage_own_photos" ON gym_progress_photos
  FOR ALL USING (user_id = auth.uid());
