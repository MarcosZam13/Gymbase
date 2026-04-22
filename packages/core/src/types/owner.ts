// owner.ts — Tipos para el módulo de reportes financieros del owner (Módulo 10)

export type OwnerPeriod = 'week' | 'month' | 'year';

export interface CashFlowEntry {
  period_label: string;
  period_start: string;
  membership_revenue: number;
  sales_revenue: number;
  total_revenue: number;
}

export interface OwnerDashboardStats {
  period: OwnerPeriod;
  revenue: {
    current: number;
    previous: number;
    membership: number;
    sales: number;
  };
  members: {
    active: number;
    expiring_soon: number;
    new_this_period: number;
    churned_this_period: number;
  };
  attendance: {
    total_visits: number;
    unique_members: number;
    avg_daily: number;
  };
  inventory: {
    total_stock_value: number;
    low_stock_count: number;
    top_products: Array<{
      name: string;
      units_sold: number;
      revenue: number;
    }>;
  };
}

export interface MembershipReport {
  plan_name: string;
  active_count: number;
  revenue_this_month: number;
  avg_retention_days: number;
  new_this_month: number;
  cancelled_this_month: number;
}

export interface AttendanceReport {
  date: string;
  total_visits: number;
  unique_members: number;
  peak_hour: number;
}

export interface SalesReport {
  product_id: string;
  product_name: string;
  category: string;
  units_sold: number;
  revenue: number;
  cost: number;
  profit: number;
  profit_margin_pct: number;
}

export interface RevenueComparison {
  current_month: number;
  previous_month: number;
  same_month_last_year: number;
  membership_breakdown: number;
  sales_breakdown: number;
}
