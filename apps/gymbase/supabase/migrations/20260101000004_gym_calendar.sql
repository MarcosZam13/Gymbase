-- 20260101000004_gym_calendar.sql — Tablas para calendario de clases y reservas
-- Nota: org_id es un UUID simple (viene de GYMBASE_ORG_ID), sin FK a organizations

-- ============================================================
-- TABLA: gym_class_types
-- Tipos de clase disponibles en el gimnasio (Yoga, CrossFit, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS gym_class_types (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL,
  name         text NOT NULL,
  color        text DEFAULT '#6366f1',
  icon         text,
  description  text
);

CREATE INDEX IF NOT EXISTS idx_gym_class_types_org ON gym_class_types(org_id);

ALTER TABLE gym_class_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_class_types" ON gym_class_types
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Todos los usuarios pueden ver los tipos de clase
CREATE POLICY "members_see_class_types" ON gym_class_types
  FOR SELECT USING (true);

-- ============================================================
-- TABLA: gym_scheduled_classes
-- Clases programadas con horario, capacidad e instructor
-- ============================================================
CREATE TABLE IF NOT EXISTS gym_scheduled_classes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL,
  type_id        uuid NOT NULL REFERENCES gym_class_types(id) ON DELETE RESTRICT,
  instructor_id  uuid NOT NULL REFERENCES auth.users(id),
  title          text NOT NULL,
  starts_at      timestamptz NOT NULL,
  ends_at        timestamptz NOT NULL,
  max_capacity   integer,
  location       text,
  description    text,
  is_cancelled   boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT valid_schedule CHECK (ends_at > starts_at)
);

-- Índice para consultas de clases por rango de fechas
CREATE INDEX IF NOT EXISTS idx_gym_scheduled_classes_range
  ON gym_scheduled_classes(org_id, starts_at, ends_at);

ALTER TABLE gym_scheduled_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_scheduled_classes" ON gym_scheduled_classes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Miembros ven las clases programadas
CREATE POLICY "members_see_scheduled_classes" ON gym_scheduled_classes
  FOR SELECT USING (true);

-- ============================================================
-- TABLA: gym_class_bookings
-- Reservas de miembros a clases específicas
-- ============================================================
CREATE TABLE IF NOT EXISTS gym_class_bookings (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id    uuid NOT NULL,
  class_id  uuid NOT NULL REFERENCES gym_scheduled_classes(id) ON DELETE CASCADE,
  status    text NOT NULL DEFAULT 'confirmed'
              CHECK (status IN ('confirmed', 'cancelled', 'waitlist')),
  booked_at timestamptz NOT NULL DEFAULT now()
);

-- Un miembro solo puede tener una reserva activa por clase
CREATE UNIQUE INDEX IF NOT EXISTS idx_gym_bookings_unique_active
  ON gym_class_bookings(user_id, class_id) WHERE status = 'confirmed';

CREATE INDEX IF NOT EXISTS idx_gym_bookings_class ON gym_class_bookings(class_id);

ALTER TABLE gym_class_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_bookings" ON gym_class_bookings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Miembros gestionan sus propias reservas
CREATE POLICY "members_manage_own_bookings" ON gym_class_bookings
  FOR ALL USING (user_id = auth.uid());

-- Ver reservas de la misma clase (para ver si está llena)
CREATE POLICY "members_see_class_bookings_count" ON gym_class_bookings
  FOR SELECT USING (true);
