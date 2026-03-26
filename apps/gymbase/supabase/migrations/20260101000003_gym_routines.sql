-- 20260101000003_gym_routines.sql — Tablas para ejercicios, rutinas y seguimiento de entrenamientos
-- Nota: org_id es un UUID simple (viene de GYMBASE_ORG_ID), sin FK a organizations

-- ============================================================
-- TABLA: gym_exercises
-- Biblioteca de ejercicios del gimnasio
-- ============================================================
CREATE TABLE IF NOT EXISTS gym_exercises (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid,
  name           text NOT NULL,
  description    text,
  video_url      text,
  thumbnail_url  text,
  muscle_group   text,
  equipment      text,
  difficulty     text NOT NULL DEFAULT 'beginner'
                   CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'expert')),
  is_global      boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gym_exercises_org ON gym_exercises(org_id);

ALTER TABLE gym_exercises ENABLE ROW LEVEL SECURITY;

-- Administradores gestionan ejercicios del gym
CREATE POLICY "admin_manage_exercises" ON gym_exercises
  FOR ALL USING (
    is_global = true
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Miembros ven todos los ejercicios (globales y del gym)
CREATE POLICY "members_see_exercises" ON gym_exercises
  FOR SELECT USING (true);

-- ============================================================
-- TABLA: gym_routines
-- Plantillas de rutinas creadas por entrenadores/admins
-- ============================================================
CREATE TABLE IF NOT EXISTS gym_routines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL,
  name            text NOT NULL,
  description     text,
  created_by      uuid NOT NULL REFERENCES auth.users(id),
  duration_weeks  integer,
  days_per_week   integer,
  is_template     boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gym_routines_org ON gym_routines(org_id);

ALTER TABLE gym_routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_routines" ON gym_routines
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Miembros ven las rutinas del gym para que puedan ver la suya asignada
CREATE POLICY "members_see_routines" ON gym_routines
  FOR SELECT USING (true);

-- ============================================================
-- TABLA: gym_routine_days
-- Días de una rutina (ej: Día 1 — Pecho y Tríceps)
-- ============================================================
CREATE TABLE IF NOT EXISTS gym_routine_days (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id  uuid NOT NULL REFERENCES gym_routines(id) ON DELETE CASCADE,
  day_number  integer NOT NULL,
  name        text
);

ALTER TABLE gym_routine_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_routine_days" ON gym_routine_days
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "members_see_routine_days" ON gym_routine_days
  FOR SELECT USING (true);

-- ============================================================
-- TABLA: gym_routine_exercises
-- Ejercicios asignados a cada día de una rutina
-- ============================================================
CREATE TABLE IF NOT EXISTS gym_routine_exercises (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id       uuid NOT NULL REFERENCES gym_routine_days(id) ON DELETE CASCADE,
  exercise_id  uuid NOT NULL REFERENCES gym_exercises(id) ON DELETE CASCADE,
  sort_order   integer NOT NULL DEFAULT 0,
  sets         integer,
  reps         text,
  rest_seconds integer,
  notes        text
);

ALTER TABLE gym_routine_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_routine_exercises" ON gym_routine_exercises
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "members_see_routine_exercises" ON gym_routine_exercises
  FOR SELECT USING (true);

-- ============================================================
-- TABLA: gym_member_routines
-- Asignación de rutinas a miembros específicos
-- ============================================================
CREATE TABLE IF NOT EXISTS gym_member_routines (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id       uuid NOT NULL,
  routine_id   uuid NOT NULL REFERENCES gym_routines(id) ON DELETE CASCADE,
  assigned_by  uuid REFERENCES auth.users(id),
  starts_at    timestamptz NOT NULL DEFAULT now(),
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Un miembro solo puede tener una rutina activa a la vez
CREATE UNIQUE INDEX IF NOT EXISTS idx_gym_member_routines_active
  ON gym_member_routines(user_id) WHERE is_active = true;

ALTER TABLE gym_member_routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_member_routines" ON gym_member_routines
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "members_see_own_routines" ON gym_member_routines
  FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- TABLA: gym_workout_logs
-- Registros de entrenamientos completados
-- ============================================================
CREATE TABLE IF NOT EXISTS gym_workout_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id            uuid NOT NULL,
  routine_day_id    uuid NOT NULL REFERENCES gym_routine_days(id) ON DELETE CASCADE,
  completed_at      timestamptz NOT NULL DEFAULT now(),
  duration_minutes  integer,
  exercises_done    jsonb
);

CREATE INDEX IF NOT EXISTS idx_gym_workout_logs_user
  ON gym_workout_logs(user_id, completed_at DESC);

ALTER TABLE gym_workout_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_manage_own_logs" ON gym_workout_logs
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "admin_see_all_logs" ON gym_workout_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
