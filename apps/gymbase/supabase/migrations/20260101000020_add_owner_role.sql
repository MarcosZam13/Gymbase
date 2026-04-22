-- add_owner_role.sql — Módulo 10: rol owner, RLS actualizada y RPCs de reportes financieros

-- ─── 1. Ampliar CHECK constraint de profiles.role ─────────────────────────────

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'member', 'owner'));

-- ─── 2. Helper is_admin_or_owner() ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_admin_or_owner()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'owner')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── 3. RLS — tablas con patrón EXISTS ───────────────────────────────────────

-- gym_inventory_products
DROP POLICY IF EXISTS "admins_manage_products" ON gym_inventory_products;
CREATE POLICY "admins_and_owner_manage_products" ON gym_inventory_products
  FOR ALL USING (is_admin_or_owner());

-- gym_inventory_movements
DROP POLICY IF EXISTS "admins_manage_movements" ON gym_inventory_movements;
CREATE POLICY "admins_and_owner_manage_movements" ON gym_inventory_movements
  FOR ALL USING (is_admin_or_owner());

-- gym_sales
DROP POLICY IF EXISTS "admins_manage_sales" ON gym_sales;
CREATE POLICY "admins_and_owner_manage_sales" ON gym_sales
  FOR ALL USING (is_admin_or_owner());

-- gym_sale_items
DROP POLICY IF EXISTS "admins_manage_sale_items" ON gym_sale_items;
CREATE POLICY "admins_and_owner_manage_sale_items" ON gym_sale_items
  FOR ALL USING (is_admin_or_owner());

-- ─── 4. RLS — tablas con patrón get_user_role() ──────────────────────────────

-- payment_proofs
DROP POLICY IF EXISTS "payment_proofs_select_own_or_admin" ON payment_proofs;
CREATE POLICY "payment_proofs_select_own_or_admin_owner" ON payment_proofs
  FOR SELECT USING (
    user_id = auth.uid()
    OR get_user_role() IN ('admin', 'owner')
  );

DROP POLICY IF EXISTS "payment_proofs_update_admin_only" ON payment_proofs;
CREATE POLICY "payment_proofs_update_admin_or_owner" ON payment_proofs
  FOR UPDATE USING (get_user_role() IN ('admin', 'owner'));

-- subscriptions
DROP POLICY IF EXISTS "subscriptions_select_own_or_admin" ON subscriptions;
CREATE POLICY "subscriptions_select_own_or_admin_owner" ON subscriptions
  FOR SELECT USING (
    user_id = auth.uid()
    OR get_user_role() IN ('admin', 'owner')
  );

DROP POLICY IF EXISTS "subscriptions_update_admin_only" ON subscriptions;
CREATE POLICY "subscriptions_update_admin_or_owner" ON subscriptions
  FOR UPDATE USING (get_user_role() IN ('admin', 'owner'));

-- profiles
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
CREATE POLICY "profiles_select_own_or_admin_owner" ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR get_user_role() IN ('admin', 'owner')
  );

DROP POLICY IF EXISTS "profiles_update_role_admin" ON profiles;
CREATE POLICY "profiles_update_role_admin_owner" ON profiles
  FOR UPDATE USING (get_user_role() IN ('admin', 'owner'));

-- gym_attendance_logs
DROP POLICY IF EXISTS "admin_full_attendance" ON gym_attendance_logs;
CREATE POLICY "admin_owner_full_attendance" ON gym_attendance_logs
  FOR ALL USING (get_user_role() IN ('admin', 'owner'));

-- gym_health_snapshots
DROP POLICY IF EXISTS "admin_manage_snapshots" ON gym_health_snapshots;
CREATE POLICY "admin_owner_manage_snapshots" ON gym_health_snapshots
  FOR ALL USING (get_user_role() IN ('admin', 'owner'));

DROP POLICY IF EXISTS "staff_see_org_snapshots" ON gym_health_snapshots;
CREATE POLICY "staff_see_org_snapshots" ON gym_health_snapshots
  FOR SELECT USING (
    org_id IN (
      SELECT profiles.org_id FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'trainer', 'owner')
    )
  );

-- gym_challenges
DROP POLICY IF EXISTS "admin_manage_challenges" ON gym_challenges;
CREATE POLICY "admin_owner_manage_challenges" ON gym_challenges
  FOR ALL USING (get_user_role() IN ('admin', 'owner'));

-- gym_challenge_participants
DROP POLICY IF EXISTS "admin_manage_participants" ON gym_challenge_participants;
CREATE POLICY "admin_owner_manage_participants" ON gym_challenge_participants
  FOR ALL USING (get_user_role() IN ('admin', 'owner'));

-- ─── 5. RPC get_cash_flow ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_cash_flow(
  p_org_id   uuid,
  p_from     timestamptz,
  p_to       timestamptz,
  p_group_by text DEFAULT 'month'  -- 'month' | 'year'
)
RETURNS TABLE (
  period_label        text,
  period_start        timestamptz,
  membership_revenue  numeric,
  sales_revenue       numeric,
  total_revenue       numeric
) AS $$
DECLARE
  v_trunc text;
  v_fmt   text;
BEGIN
  -- Solo el owner puede llamar a este RPC
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_trunc := CASE p_group_by WHEN 'year' THEN 'year' ELSE 'month' END;
  v_fmt   := CASE p_group_by WHEN 'year' THEN 'YYYY' ELSE 'Mon YYYY' END;

  RETURN QUERY
  WITH periods AS (
    SELECT date_trunc(v_trunc, gs) AS period_start
    FROM generate_series(
      date_trunc(v_trunc, p_from),
      date_trunc(v_trunc, p_to),
      ('1 ' || v_trunc)::interval
    ) AS gs
  ),
  membership_by_period AS (
    SELECT
      date_trunc(v_trunc, pp.created_at) AS period,
      COALESCE(SUM(COALESCE(pp.amount, mp.price)), 0) AS revenue
    FROM payment_proofs pp
    JOIN subscriptions s   ON s.id  = pp.subscription_id
    JOIN membership_plans mp ON mp.id = s.plan_id
    WHERE pp.status = 'approved'
      AND pp.org_id = p_org_id
      AND pp.created_at BETWEEN p_from AND p_to
    GROUP BY 1
  ),
  sales_by_period AS (
    SELECT
      date_trunc(v_trunc, created_at) AS period,
      COALESCE(SUM(total_amount), 0) AS revenue
    FROM gym_sales
    WHERE org_id = p_org_id
      AND created_at BETWEEN p_from AND p_to
    GROUP BY 1
  )
  SELECT
    to_char(p.period_start, v_fmt)                       AS period_label,
    p.period_start                                        AS period_start,
    COALESCE(mem.revenue, 0)                              AS membership_revenue,
    COALESCE(sal.revenue, 0)                              AS sales_revenue,
    COALESCE(mem.revenue, 0) + COALESCE(sal.revenue, 0)  AS total_revenue
  FROM periods p
  LEFT JOIN membership_by_period mem ON mem.period = p.period_start
  LEFT JOIN sales_by_period      sal ON sal.period  = p.period_start
  ORDER BY p.period_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
