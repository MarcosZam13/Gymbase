-- 20260101000007_organizations.sql — Tabla de configuración del gym (organización)
-- Esta tabla es el núcleo de la arquitectura single-tenant de GymBase.
-- Un deployment = un gym = un registro en esta tabla.
-- El GYMBASE_ORG_ID env var debe corresponder al id de este registro.

-- ============================================================
-- TABLA: organizations
-- Datos de la organización/gym: nombre, pago, capacidad, reglas
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_name         text,
  slogan           text,
  sinpe_number     text,
  sinpe_name       text,
  max_capacity     integer CHECK (max_capacity IS NULL OR max_capacity > 0),
  -- Minutos mínimos para cancelar una clase reservada. 0 = sin restricción.
  cancel_minutes   integer DEFAULT 0 CHECK (cancel_minutes IS NULL OR cancel_minutes >= 0),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden leer y actualizar su propia organización
CREATE POLICY "admins_read_organization" ON organizations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admins_update_organization" ON organizations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- INSTRUCCIÓN DE SETUP: Insertar el registro del gym
-- ============================================================
-- Después de aplicar esta migración, inserta el registro de tu gym:
--
--   INSERT INTO organizations (id, gym_name)
--   VALUES ('<TU_GYMBASE_ORG_ID>', 'Nombre del Gym');
--
-- Y configura la variable de entorno:
--   GYMBASE_ORG_ID=<TU_GYMBASE_ORG_ID>
--
-- Si ya tienes GYMBASE_ORG_ID definido, puedes reutilizar ese UUID:
--   INSERT INTO organizations (id, gym_name)
--   VALUES (current_setting('app.org_id', true)::uuid, 'Mi Gym')
--   ON CONFLICT (id) DO NOTHING;
