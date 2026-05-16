-- 20260513000001_org_members_multi_gym.sql
-- Implementa la arquitectura multi-gym real: una cuenta GymBase funciona en cualquier gym.
-- Reemplaza profiles.org_id + profiles.role con la tabla org_members(user_id, org_id, role).
--
-- CÓMO FUNCIONA:
--   get_user_org_id() lee el header HTTP x-org-id (inyectado por Next.js createClient)
--   y valida que el usuario tenga una fila en org_members para ese org.
--   Si no tiene fila → retorna NULL → todas las políticas RLS fallan → no ve datos.
--   El middleware hace auto-join (crea la fila) cuando el usuario entra a un gym nuevo.

-- ═══════════════════════════════════════════════════════════════════
-- 1. TABLA org_members
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS org_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role            text NOT NULL DEFAULT 'member'
                  CHECK (role IN ('member', 'admin', 'owner')),
  joined_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id  ON org_members(org_id);

-- ═══════════════════════════════════════════════════════════════════
-- 2. MIGRAR DATOS EXISTENTES desde profiles
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO org_members (user_id, org_id, role, joined_at)
SELECT id, org_id, role, created_at
FROM profiles
WHERE org_id IS NOT NULL
ON CONFLICT (user_id, org_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- 3. RLS en org_members
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- Usuarios ven sus propias filas en cualquier org (necesario para el middleware)
CREATE POLICY "users_see_own_memberships" ON org_members
  FOR SELECT USING (user_id = auth.uid());

-- Admins ven todas las membresías de su org
CREATE POLICY "admins_see_org_memberships" ON org_members
  FOR SELECT USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- Auto-join: usuarios pueden crearse su propia fila como 'member'
CREATE POLICY "users_auto_join" ON org_members
  FOR INSERT WITH CHECK (user_id = auth.uid() AND role = 'member');

-- Admins gestionan membresías de su org
CREATE POLICY "admins_manage_memberships" ON org_members
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- ═══════════════════════════════════════════════════════════════════
-- 4. FUNCIONES SQL ACTUALIZADAS
-- ═══════════════════════════════════════════════════════════════════

-- get_user_org_id(): lee x-org-id del header HTTP (puesto por Next.js createClient)
-- y valida que el usuario tenga una fila en org_members para ese org.
-- PostgREST expone los headers de la request en current_setting('request.headers').
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_headers_raw text;
  v_org_id      uuid;
BEGIN
  -- Leer headers crudos (PostgREST los pone como JSON en el GUC request.headers)
  BEGIN
    v_headers_raw := current_setting('request.headers', true);
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;

  IF v_headers_raw IS NULL OR v_headers_raw = '' THEN
    RETURN NULL;
  END IF;

  -- Extraer x-org-id del objeto JSON
  BEGIN
    v_org_id := (v_headers_raw::json->>'x-org-id')::uuid;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;

  IF v_org_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Validar: el usuario debe tener una fila en org_members para este org
  PERFORM 1 FROM org_members
  WHERE user_id = auth.uid() AND org_id = v_org_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN v_org_id;
END;
$$;

-- get_user_role(): rol del usuario autenticado en el org actual (del header x-org-id)
-- 'owner' se devuelve como 'admin' para unificar checks de permisos.
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_headers_raw text;
  v_org_id      uuid;
  v_role        text;
BEGIN
  BEGIN
    v_headers_raw := current_setting('request.headers', true);
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;

  IF v_headers_raw IS NULL OR v_headers_raw = '' THEN
    RETURN NULL;
  END IF;

  BEGIN
    v_org_id := (v_headers_raw::json->>'x-org-id')::uuid;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;

  IF v_org_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT CASE om.role WHEN 'owner' THEN 'admin' ELSE om.role END
  INTO v_role
  FROM org_members om
  WHERE om.user_id = auth.uid() AND om.org_id = v_org_id;

  RETURN v_role;
END;
$$;

-- get_user_raw_role(): igual que get_user_role() pero sin mapear owner→admin
-- Necesaria para checks que distinguen owner explícitamente (ej: middleware)
CREATE OR REPLACE FUNCTION get_user_raw_role()
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_headers_raw text;
  v_org_id      uuid;
  v_role        text;
BEGIN
  BEGIN
    v_headers_raw := current_setting('request.headers', true);
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;

  IF v_headers_raw IS NULL OR v_headers_raw = '' THEN
    RETURN NULL;
  END IF;

  BEGIN
    v_org_id := (v_headers_raw::json->>'x-org-id')::uuid;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;

  IF v_org_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT om.role INTO v_role
  FROM org_members om
  WHERE om.user_id = auth.uid() AND om.org_id = v_org_id;

  RETURN v_role;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 5. TRIGGER handle_new_user ACTUALIZADO
-- ═══════════════════════════════════════════════════════════════════
-- Crea perfil global + fila en org_members si viene org_id en metadata.
-- Google OAuth no pasa org_id → solo crea profiles; el middleware hace auto-join.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id uuid;
  v_role   text;
BEGIN
  -- Crear/actualizar perfil global (sin org_id ni role — van en org_members)
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
    SET
      full_name  = COALESCE(EXCLUDED.full_name, profiles.full_name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url);

  -- Si viene org_id en metadata (signup con contraseña / invitación), crear membresía
  IF NEW.raw_user_meta_data->>'org_id' IS NOT NULL
     AND NEW.raw_user_meta_data->>'org_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  THEN
    v_org_id := (NEW.raw_user_meta_data->>'org_id')::uuid;
    v_role   := COALESCE(NEW.raw_user_meta_data->>'role', 'member');

    -- Validar role permitido
    IF v_role NOT IN ('member', 'admin', 'owner') THEN
      v_role := 'member';
    END IF;

    INSERT INTO org_members (user_id, org_id, role)
    VALUES (NEW.id, v_org_id, v_role)
    ON CONFLICT (user_id, org_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════
-- 6. AUTH HOOK ACTUALIZADO
-- ═══════════════════════════════════════════════════════════════════
-- Ya no inyectamos org_id en el JWT porque get_user_org_id() lo lee del header HTTP.
-- Simplificamos el hook para solo inyectar el role en el JWT (opcional, para futuro).

CREATE OR REPLACE FUNCTION custom_access_token_hook(event JSONB)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Hook simplificado: sin inyección de org_id (se lee del header x-org-id)
  RETURN event;
END;
$$;

GRANT EXECUTE ON FUNCTION custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION custom_access_token_hook FROM PUBLIC;

-- ═══════════════════════════════════════════════════════════════════
-- 7. PARCHEAR POLÍTICAS RLS QUE REFERENCIAN profiles.role DIRECTAMENTE
--    Reemplazar EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN (...))
--    por get_user_role() = 'admin'
-- ═══════════════════════════════════════════════════════════════════

-- gym_health_profiles
DROP POLICY IF EXISTS "staff_see_org_health" ON gym_health_profiles;
DROP POLICY IF EXISTS "staff_manage_health" ON gym_health_profiles;

CREATE POLICY "staff_see_org_health" ON gym_health_profiles
  FOR SELECT USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

CREATE POLICY "staff_manage_health" ON gym_health_profiles
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- gym_health_snapshots
DROP POLICY IF EXISTS "staff_see_org_snapshots" ON gym_health_snapshots;
DROP POLICY IF EXISTS "staff_insert_snapshots" ON gym_health_snapshots;

CREATE POLICY "staff_see_org_snapshots" ON gym_health_snapshots
  FOR SELECT USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

CREATE POLICY "staff_insert_snapshots" ON gym_health_snapshots
  FOR INSERT WITH CHECK (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- gym_member_routines
DROP POLICY IF EXISTS "staff_manage_member_routines" ON gym_member_routines;

CREATE POLICY "staff_manage_member_routines" ON gym_member_routines
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- gym_personal_records
DROP POLICY IF EXISTS "staff_see_member_prs" ON gym_personal_records;

CREATE POLICY "staff_see_member_prs" ON gym_personal_records
  FOR SELECT USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- gym_qr_codes
DROP POLICY IF EXISTS "admin_see_org_qr" ON gym_qr_codes;

CREATE POLICY "admin_see_org_qr" ON gym_qr_codes
  FOR SELECT USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- gym_routines
DROP POLICY IF EXISTS "staff_manage_routines" ON gym_routines;

CREATE POLICY "staff_manage_routines" ON gym_routines
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- gym_workout_logs
DROP POLICY IF EXISTS "staff_see_workout_logs" ON gym_workout_logs;

CREATE POLICY "staff_see_workout_logs" ON gym_workout_logs
  FOR SELECT USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- gym_scheduled_classes (challenges uses get_user_role() already — skip)
-- gym_class_bookings: check if it references profiles.role
DROP POLICY IF EXISTS "staff_see_all_bookings" ON gym_class_bookings;
CREATE POLICY "staff_see_all_bookings" ON gym_class_bookings
  FOR SELECT USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- gym_attendance_logs
DROP POLICY IF EXISTS "staff_see_attendance" ON gym_attendance_logs;
CREATE POLICY "staff_see_attendance" ON gym_attendance_logs
  FOR SELECT USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- gym_class_attendance
DROP POLICY IF EXISTS "staff_manage_attendance" ON gym_class_attendance;
CREATE POLICY "staff_manage_attendance" ON gym_class_attendance
  FOR ALL USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- gym_class_bookings (admin_see_all_bookings)
DROP POLICY IF EXISTS "admin_see_all_bookings" ON gym_class_bookings;
CREATE POLICY "admin_see_all_bookings" ON gym_class_bookings
  FOR SELECT USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- gym_progress_photos
DROP POLICY IF EXISTS "staff_see_org_photos" ON gym_progress_photos;
CREATE POLICY "staff_see_org_photos" ON gym_progress_photos
  FOR SELECT USING (org_id = get_user_org_id() AND get_user_role() = 'admin');

-- ═══════════════════════════════════════════════════════════════════
-- 8. ACTUALIZAR RLS DE profiles (quitar refs a org_id y role)
-- ═══════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "profiles_select_own_or_admin_owner" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_role_admin_owner" ON profiles;

-- Usuarios ven su propio perfil; admins ven perfiles de miembros de su org
CREATE POLICY "profiles_select_own_or_admin_owner" ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR (
      get_user_role() = 'admin'
      AND EXISTS (
        SELECT 1 FROM org_members om
        WHERE om.user_id = profiles.id
          AND om.org_id = get_user_org_id()
      )
    )
  );

-- Usuarios editan su propio perfil (role ya no está aquí — va en org_members)
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins pueden editar perfiles de miembros de su org (nombre, teléfono, avatar)
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (
    get_user_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.user_id = profiles.id
        AND om.org_id = get_user_org_id()
    )
  );

-- ═══════════════════════════════════════════════════════════════════
-- 9. DROPEAR COLUMNAS OBSOLETAS DE profiles
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE profiles
  DROP COLUMN IF EXISTS org_id,
  DROP COLUMN IF EXISTS role,
  DROP COLUMN IF EXISTS current_streak,
  DROP COLUMN IF EXISTS longest_streak,
  DROP COLUMN IF EXISTS last_checkin_at;

-- ═══════════════════════════════════════════════════════════════════
-- 10. AGREGAR zenith-club A organizations (para dev/demo)
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO organizations (id, slug, name, domain, gym_name)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'zenith-club',
  'Zenith Club',
  'zenith.gymbase.app',
  'Zenith Club'
)
ON CONFLICT (id) DO NOTHING;

-- Asegurar que iron-gym tenga slug/domain/name actualizados
UPDATE organizations
SET
  slug     = 'iron-gym',
  name     = 'Iron Gym',
  domain   = 'iron-gym.gymbase.app',
  gym_name = 'Iron Gym'
WHERE id = '00000000-0000-0000-0000-000000000001';
