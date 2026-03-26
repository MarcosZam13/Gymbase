-- 20260101000001_gym_checkin.sql — Tablas para QR check-in y registro de asistencia
-- Nota: org_id es un UUID simple (viene de GYMBASE_ORG_ID), sin FK a organizations

-- ============================================================
-- TABLA: gym_qr_codes
-- Almacena el código QR activo de cada miembro
-- ============================================================
CREATE TABLE IF NOT EXISTS gym_qr_codes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id     uuid NOT NULL,
  qr_code    text NOT NULL UNIQUE,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índice para búsqueda rápida por código QR al escanear
CREATE INDEX IF NOT EXISTS idx_gym_qr_codes_code ON gym_qr_codes(qr_code) WHERE is_active = true;
-- Índice para obtener el QR activo de un usuario
CREATE INDEX IF NOT EXISTS idx_gym_qr_codes_user ON gym_qr_codes(user_id) WHERE is_active = true;

ALTER TABLE gym_qr_codes ENABLE ROW LEVEL SECURITY;

-- Administradores ven todos los QR del gym
CREATE POLICY "admin_manage_qr_codes" ON gym_qr_codes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Miembros solo ven su propio QR
CREATE POLICY "members_see_own_qr" ON gym_qr_codes
  FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- TABLA: gym_attendance_logs
-- Registra cada check-in/check-out en el gimnasio
-- ============================================================
CREATE TABLE IF NOT EXISTS gym_attendance_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id            uuid NOT NULL,
  check_in_at       timestamptz NOT NULL DEFAULT now(),
  check_out_at      timestamptz,
  registered_by     uuid REFERENCES auth.users(id),
  duration_minutes  integer GENERATED ALWAYS AS (
    CASE
      WHEN check_out_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (check_out_at - check_in_at)) / 60
      ELSE NULL
    END
  ) STORED
);

-- Índice parcial: previene que un usuario tenga dos check-ins abiertos simultáneos
CREATE UNIQUE INDEX IF NOT EXISTS idx_gym_attendance_open
  ON gym_attendance_logs(user_id) WHERE check_out_at IS NULL;

-- Índice para consultas de asistencia por organización y fecha
CREATE INDEX IF NOT EXISTS idx_gym_attendance_org_date
  ON gym_attendance_logs(org_id, check_in_at DESC);

ALTER TABLE gym_attendance_logs ENABLE ROW LEVEL SECURITY;

-- Administradores ven toda la asistencia
CREATE POLICY "admin_manage_attendance" ON gym_attendance_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Miembros solo ven su propio historial
CREATE POLICY "members_see_own_attendance" ON gym_attendance_logs
  FOR SELECT USING (user_id = auth.uid());

-- El sistema puede insertar check-ins (kiosko QR no autenticado)
CREATE POLICY "system_insert_checkin" ON gym_attendance_logs
  FOR INSERT WITH CHECK (true);
