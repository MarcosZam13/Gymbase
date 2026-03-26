-- 20260101000006_fix_checkin_rls.sql
-- Corrige las políticas RLS de gym_attendance_logs para permitir check-ins desde admin/trainer

-- Eliminar políticas existentes para recrearlas de forma explícita
DROP POLICY IF EXISTS "admin_manage_attendance"  ON gym_attendance_logs;
DROP POLICY IF EXISTS "members_see_own_attendance" ON gym_attendance_logs;
DROP POLICY IF EXISTS "system_insert_checkin"    ON gym_attendance_logs;

-- Admins: acceso total (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "admin_full_attendance" ON gym_attendance_logs
  FOR ALL
  USING      (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Trainers: pueden insertar y ver todos los registros
CREATE POLICY "trainer_manage_attendance" ON gym_attendance_logs
  FOR ALL
  USING      (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'trainer'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'trainer'));

-- Miembros: solo pueden ver su propio historial
CREATE POLICY "members_see_own_attendance" ON gym_attendance_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- Miembros: pueden insertar su propio check-in (para escáner de kiosko sin sesión admin)
CREATE POLICY "members_insert_own_checkin" ON gym_attendance_logs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
