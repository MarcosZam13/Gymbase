-- 20260511000001_drop_org_config.sql
-- M17: el tema se sirve desde archivos de código (clients/gymbase/<client>/theme.config.ts)
-- La columna config y la función get_org_config ya no se utilizan.

-- 1. Eliminar la función RPC que el middleware llamaba para leer el config visual
DROP FUNCTION IF EXISTS get_org_config(uuid);

-- 2. Eliminar el constraint que validaba la estructura del config JSONB
ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS organizations_config_has_required_sections;

-- 3. Eliminar la columna config — ya no se lee ni se escribe desde la app
ALTER TABLE organizations
  DROP COLUMN IF EXISTS config;
