-- fix_owner_stats_revenue — Agrega campos de revenue al RPC get_gym_stats para el owner dashboard

CREATE OR REPLACE FUNCTION public.get_gym_stats(p_org_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  v_month_start timestamptz := date_trunc('month', CURRENT_DATE);
BEGIN
  SELECT json_build_object(
    -- Campos originales de operación
    'current_occupancy', (
      SELECT COUNT(*) FROM gym_attendance_logs
      WHERE org_id = p_org_id AND check_out_at IS NULL
    ),
    'checkins_today', (
      SELECT COUNT(*) FROM gym_attendance_logs
      WHERE org_id = p_org_id AND check_in_at >= CURRENT_DATE
    ),
    'active_routines', (
      SELECT COUNT(*) FROM gym_member_routines
      WHERE org_id = p_org_id AND is_active = true
    ),
    'classes_today', (
      SELECT COUNT(*) FROM gym_scheduled_classes
      WHERE org_id = p_org_id
        AND starts_at >= CURRENT_DATE
        AND starts_at < CURRENT_DATE + INTERVAL '1 day'
        AND is_cancelled = false
    ),
    'active_challenges', (
      SELECT COUNT(*) FROM gym_challenges
      WHERE org_id = p_org_id
        AND starts_at <= now()
        AND ends_at >= now()
    ),
    'total_workouts_this_month', (
      SELECT COUNT(*) FROM gym_workout_logs
      WHERE org_id = p_org_id
        AND completed_at >= v_month_start
    ),
    -- Campos de revenue del mes actual
    'membership_revenue_month', (
      SELECT COALESCE(SUM(COALESCE(pp.amount, mp.price)), 0)
      FROM payment_proofs pp
      JOIN subscriptions s ON s.id = pp.subscription_id
      JOIN membership_plans mp ON mp.id = s.plan_id
      WHERE pp.org_id = p_org_id
        AND pp.status = 'approved'
        AND pp.created_at >= v_month_start
    ),
    'sales_revenue_month', (
      SELECT COALESCE(SUM(total_amount), 0)
      FROM gym_sales
      WHERE org_id = p_org_id
        AND created_at >= v_month_start
    ),
    'expenses_month', (
      SELECT COALESCE(SUM(amount), 0)
      FROM gym_expenses
      WHERE org_id = p_org_id
        AND expense_date >= v_month_start::date
    ),
    'active_members_count', (
      SELECT COUNT(DISTINCT s.user_id)
      FROM subscriptions s
      JOIN profiles p ON p.id = s.user_id
      WHERE p.org_id = p_org_id
        AND s.status = 'active'
    ),
    'new_members_month', (
      SELECT COUNT(*)
      FROM profiles
      WHERE org_id = p_org_id
        AND role = 'member'
        AND created_at >= v_month_start
    )
  ) INTO result;

  RETURN result;
END;
$$;
