-- 20260101000019_inventory_and_sales.sql
-- Schema para los módulos de Inventario (8) y Ventas/Marketplace base (9)

-- ─── gym_inventory_products ───────────────────────────────────────────────────

CREATE TABLE gym_inventory_products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL,
  name            text NOT NULL,
  description     text,
  sku             text,
  category        text NOT NULL CHECK (category IN ('supplement','apparel','equipment','food_drink','other')),
  unit            text NOT NULL DEFAULT 'unit' CHECK (unit IN ('unit','kg','liter','pack')),
  cost_price      numeric(10,2) NOT NULL DEFAULT 0,
  sale_price      numeric(10,2) NOT NULL DEFAULT 0,
  current_stock   integer NOT NULL DEFAULT 0,
  min_stock_alert integer NOT NULL DEFAULT 5,
  image_url       text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON gym_inventory_products (org_id);
CREATE INDEX ON gym_inventory_products (org_id, is_active);
-- Índice parcial para consultas de alertas de stock bajo sin full scan
CREATE INDEX idx_low_stock ON gym_inventory_products (org_id)
  WHERE current_stock <= min_stock_alert AND is_active = true;

-- ─── gym_inventory_movements ─────────────────────────────────────────────────

CREATE TABLE gym_inventory_movements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES gym_inventory_products(id) ON DELETE CASCADE,
  org_id          uuid NOT NULL,
  type            text NOT NULL CHECK (type IN ('restock','sale','adjustment','waste')),
  quantity        integer NOT NULL, -- positivo para entradas, negativo para salidas
  previous_stock  integer NOT NULL,
  new_stock       integer NOT NULL,
  unit_price      numeric(10,2),    -- precio al momento del movimiento (historial)
  notes           text,
  sale_id         uuid,             -- FK a gym_sales, se agrega con ALTER después
  created_by      uuid NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON gym_inventory_movements (product_id, created_at DESC);
CREATE INDEX ON gym_inventory_movements (org_id, created_at DESC);
CREATE INDEX ON gym_inventory_movements (sale_id) WHERE sale_id IS NOT NULL;

-- ─── Trigger: sincronizar current_stock al insertar un movimiento ─────────────

CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE gym_inventory_products
  SET
    current_stock = NEW.new_stock,
    updated_at    = now()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_product_stock
AFTER INSERT ON gym_inventory_movements
FOR EACH ROW EXECUTE FUNCTION update_product_stock();

-- ─── gym_sales ────────────────────────────────────────────────────────────────

CREATE TABLE gym_sales (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL,
  sold_by         uuid NOT NULL REFERENCES auth.users(id),
  member_id       uuid REFERENCES auth.users(id), -- nullable: ventas a no-miembros
  payment_method  text NOT NULL CHECK (payment_method IN ('cash','card','sinpe','other')),
  total_amount    numeric(10,2) NOT NULL DEFAULT 0,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON gym_sales (org_id, created_at DESC);
CREATE INDEX ON gym_sales (org_id, sold_by);
CREATE INDEX ON gym_sales (org_id, member_id) WHERE member_id IS NOT NULL;

-- ─── gym_sale_items ───────────────────────────────────────────────────────────

CREATE TABLE gym_sale_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id     uuid NOT NULL REFERENCES gym_sales(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES gym_inventory_products(id),
  quantity    integer NOT NULL CHECK (quantity > 0),
  unit_price  numeric(10,2) NOT NULL,
  -- columna generada: precio * cantidad sin posibilidad de inconsistencia
  subtotal    numeric(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

CREATE INDEX ON gym_sale_items (sale_id);
CREATE INDEX ON gym_sale_items (product_id);

-- ─── FK diferida: gym_inventory_movements → gym_sales ────────────────────────
-- Se agrega después de crear gym_sales para evitar dependencia circular

ALTER TABLE gym_inventory_movements
  ADD CONSTRAINT fk_movement_sale
  FOREIGN KEY (sale_id) REFERENCES gym_sales(id) ON DELETE SET NULL;

-- ─── RLS: gym_inventory_products ─────────────────────────────────────────────

ALTER TABLE gym_inventory_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_products" ON gym_inventory_products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Miembros solo ven productos activos (para la tienda del portal)
CREATE POLICY "members_view_active_products" ON gym_inventory_products
  FOR SELECT USING (is_active = true);

-- ─── RLS: gym_inventory_movements ────────────────────────────────────────────

ALTER TABLE gym_inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_movements" ON gym_inventory_movements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── RLS: gym_sales ──────────────────────────────────────────────────────────

ALTER TABLE gym_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_sales" ON gym_sales
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── RLS: gym_sale_items ─────────────────────────────────────────────────────

ALTER TABLE gym_sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_sale_items" ON gym_sale_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
