// owner.actions.ts — Server actions exclusivas del rol owner para reportes financieros

"use server";

import { createClient, getCurrentUser, getOrgId } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/database";
import type {
  OwnerPeriod,
  OwnerDashboardStats,
  CashFlowEntry,
  MembershipReport,
  AttendanceReport,
  SalesReport,
  RevenueComparison,
} from "@core/types/owner";

// ─── Helpers de fecha ─────────────────────────────────────────────────────────

interface PeriodRange {
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
  days: number;
}

function getPeriodRange(period: OwnerPeriod): PeriodRange {
  const now = new Date();
  let from: Date, to: Date, prevFrom: Date, prevTo: Date, days: number;

  if (period === 'week') {
    // Últimos 7 días completos
    to = new Date(now);
    to.setHours(23, 59, 59, 999);
    from = new Date(now);
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    days = 7;
    prevTo = new Date(from);
    prevTo.setDate(prevTo.getDate() - 1);
    prevTo.setHours(23, 59, 59, 999);
    prevFrom = new Date(prevTo);
    prevFrom.setDate(prevFrom.getDate() - 6);
    prevFrom.setHours(0, 0, 0, 0);
  } else if (period === 'year') {
    // Año en curso
    from = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    to = new Date(now);
    to.setHours(23, 59, 59, 999);
    days = Math.ceil((to.getTime() - from.getTime()) / 86400000);
    prevFrom = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
    prevTo = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
  } else {
    // Mes en curso
    from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    to = new Date(now);
    to.setHours(23, 59, 59, 999);
    days = to.getDate();
    prevFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    prevTo = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  }

  return { from, to, prevFrom, prevTo, days };
}

// Verificación de rol owner — usada en todas las actions
async function requireOwner(): Promise<{ userId: string } | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") return null;
  return { userId: user.id };
}

// ─── getOwnerDashboardStats ───────────────────────────────────────────────────

export async function getOwnerDashboardStats(
  period: OwnerPeriod
): Promise<ActionResult<OwnerDashboardStats>> {
  const auth = await requireOwner();
  if (!auth) return { success: false, error: "Acceso denegado" };

  const supabase = await createClient();
  const orgId = await getOrgId();
  const { from, to, prevFrom, prevTo, days } = getPeriodRange(period);

  try {
    const [
      membershipCurrentRes,
      membershipPrevRes,
      salesCurrentRes,
      salesPrevRes,
      membersRes,
      attendanceRes,
      inventoryProductsRes,
      topProductsRes,
    ] = await Promise.all([
      // Ingresos de membresías — período actual
      supabase
        .from("payment_proofs")
        .select("amount, subscription_id, subscriptions!inner(plan_id, membership_plans!inner(price))")
        .eq("status", "approved")
        .eq("org_id", orgId)
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString()),

      // Ingresos de membresías — período anterior
      supabase
        .from("payment_proofs")
        .select("amount, subscription_id, subscriptions!inner(plan_id, membership_plans!inner(price))")
        .eq("status", "approved")
        .eq("org_id", orgId)
        .gte("created_at", prevFrom.toISOString())
        .lte("created_at", prevTo.toISOString()),

      // Ingresos de ventas — período actual
      supabase
        .from("gym_sales")
        .select("total_amount")
        .eq("org_id", orgId)
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString()),

      // Ingresos de ventas — período anterior
      supabase
        .from("gym_sales")
        .select("total_amount")
        .eq("org_id", orgId)
        .gte("created_at", prevFrom.toISOString())
        .lte("created_at", prevTo.toISOString()),

      // Métricas de miembros
      supabase
        .from("subscriptions")
        .select("status, starts_at, expires_at, created_at, updated_at")
        .eq("org_id", orgId),

      // Asistencia del período
      supabase
        .from("gym_attendance_logs")
        .select("user_id, check_in_at")
        .eq("org_id", orgId)
        .gte("check_in_at", from.toISOString())
        .lte("check_in_at", to.toISOString()),

      // Inventario
      supabase
        .from("gym_inventory_products")
        .select("current_stock, cost_price, min_stock_alert")
        .eq("org_id", orgId)
        .eq("is_active", true),

      // Top productos vendidos en el período
      supabase
        .from("gym_sale_items")
        .select("product_id, quantity, unit_price, subtotal, product:gym_inventory_products!inner(name, org_id)")
        .eq("gym_inventory_products.org_id", orgId),
    ]);

    // Calcular ingresos actuales
    const membershipCurrent = (membershipCurrentRes.data ?? []).reduce(
      (sum, pp) => {
        const subs = Array.isArray(pp.subscriptions) ? pp.subscriptions[0] : pp.subscriptions;
        const plan = subs ? (Array.isArray(subs.membership_plans) ? subs.membership_plans[0] : subs.membership_plans) : null;
        return sum + Number(pp.amount ?? plan?.price ?? 0);
      },
      0
    );
    const salesCurrent = (salesCurrentRes.data ?? []).reduce((sum, s) => sum + Number(s.total_amount), 0);
    const totalCurrent = membershipCurrent + salesCurrent;

    // Calcular ingresos anteriores
    const membershipPrev = (membershipPrevRes.data ?? []).reduce(
      (sum, pp) => {
        const subs = Array.isArray(pp.subscriptions) ? pp.subscriptions[0] : pp.subscriptions;
        const plan = subs ? (Array.isArray(subs.membership_plans) ? subs.membership_plans[0] : subs.membership_plans) : null;
        return sum + Number(pp.amount ?? plan?.price ?? 0);
      },
      0
    );
    const salesPrev = (salesPrevRes.data ?? []).reduce((sum, s) => sum + Number(s.total_amount), 0);
    const totalPrev = membershipPrev + salesPrev;

    // Métricas de miembros
    const now = new Date();
    const soonThreshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const subs = membersRes.data ?? [];
    const activeCount = subs.filter((s) => s.status === "active").length;
    const expiringSoon = subs.filter(
      (s) => s.status === "active" && new Date(s.expires_at) <= soonThreshold
    ).length;
    const newThisPeriod = subs.filter(
      (s) => new Date(s.created_at) >= from && new Date(s.created_at) <= to
    ).length;
    const churnedThisPeriod = subs.filter(
      (s) =>
        (s.status === "cancelled" || s.status === "expired") &&
        new Date(s.updated_at) >= from &&
        new Date(s.updated_at) <= to
    ).length;

    // Métricas de asistencia
    const attendanceLogs = attendanceRes.data ?? [];
    const uniqueMembers = new Set(attendanceLogs.map((a) => a.user_id)).size;
    const avgDaily = days > 0 ? Math.round(attendanceLogs.length / days) : 0;

    // Inventario
    const products = inventoryProductsRes.data ?? [];
    const totalStockValue = products.reduce((sum, p) => sum + p.current_stock * Number(p.cost_price), 0);
    const lowStockCount = products.filter((p) => p.current_stock <= p.min_stock_alert).length;

    // Top productos
    const productMap = new Map<string, { name: string; units_sold: number; revenue: number }>();
    for (const item of topProductsRes.data ?? []) {
      const prod = Array.isArray(item.product) ? item.product[0] : item.product;
      if (!prod) continue;
      const existing = productMap.get(item.product_id as string);
      if (existing) {
        existing.units_sold += item.quantity as number;
        existing.revenue += Number(item.subtotal);
      } else {
        productMap.set(item.product_id as string, {
          name: (prod as { name: string }).name,
          units_sold: item.quantity as number,
          revenue: Number(item.subtotal),
        });
      }
    }
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      success: true,
      data: {
        period,
        revenue: {
          current: totalCurrent,
          previous: totalPrev,
          membership: membershipCurrent,
          sales: salesCurrent,
        },
        members: {
          active: activeCount,
          expiring_soon: expiringSoon,
          new_this_period: newThisPeriod,
          churned_this_period: churnedThisPeriod,
        },
        attendance: {
          total_visits: attendanceLogs.length,
          unique_members: uniqueMembers,
          avg_daily: avgDaily,
        },
        inventory: {
          total_stock_value: totalStockValue,
          low_stock_count: lowStockCount,
          top_products: topProducts,
        },
      },
    };
  } catch (error) {
    console.error("[getOwnerDashboardStats] Error:", error);
    return { success: false, error: "Error al cargar estadísticas del dashboard." };
  }
}

// ─── getCashFlow ──────────────────────────────────────────────────────────────

export async function getCashFlow(
  period: OwnerPeriod,
  year?: number
): Promise<ActionResult<CashFlowEntry[]>> {
  const auth = await requireOwner();
  if (!auth) return { success: false, error: "Acceso denegado" };

  const supabase = await createClient();
  const orgId = await getOrgId();
  const now = new Date();
  const targetYear = year ?? now.getFullYear();

  let from: Date, to: Date, groupBy: "month" | "year";

  if (period === "week") {
    // Últimas 8 semanas — agrupamos por mes en DB y dejamos que el front maneje semanas
    to = new Date(now);
    from = new Date(now);
    from.setDate(from.getDate() - 55); // ~8 semanas
    groupBy = "month";
  } else if (period === "year") {
    // Últimos 3 años agrupados por año
    from = new Date(targetYear - 2, 0, 1, 0, 0, 0, 0);
    to = new Date(targetYear, 11, 31, 23, 59, 59, 999);
    groupBy = "year";
  } else {
    // 12 meses del año objetivo
    from = new Date(targetYear, 0, 1, 0, 0, 0, 0);
    to = new Date(targetYear, 11, 31, 23, 59, 59, 999);
    groupBy = "month";
  }

  try {
    const { data, error } = await supabase.rpc("get_cash_flow", {
      p_org_id: orgId,
      p_from: from.toISOString(),
      p_to: to.toISOString(),
      p_group_by: groupBy,
    });

    if (error) throw error;

    const entries: CashFlowEntry[] = (data ?? []).map((row: Record<string, unknown>) => ({
      period_label: String(row.period_label),
      period_start: String(row.period_start),
      membership_revenue: Number(row.membership_revenue),
      sales_revenue: Number(row.sales_revenue),
      total_revenue: Number(row.total_revenue),
    }));

    return { success: true, data: entries };
  } catch (error) {
    console.error("[getCashFlow] Error:", error);
    return { success: false, error: "Error al cargar el flujo de caja." };
  }
}

// ─── getMembershipReport ──────────────────────────────────────────────────────

export async function getMembershipReport(
  period: OwnerPeriod
): Promise<ActionResult<MembershipReport[]>> {
  const auth = await requireOwner();
  if (!auth) return { success: false, error: "Acceso denegado" };

  const supabase = await createClient();
  const orgId = await getOrgId();
  const { from, to } = getPeriodRange(period);

  try {
    // Traer planes y suscripciones con pagos aprobados
    const [plansRes, subsRes, paymentsRes] = await Promise.all([
      supabase
        .from("membership_plans")
        .select("id, name, price")
        .eq("org_id", orgId),

      supabase
        .from("subscriptions")
        .select("id, plan_id, status, starts_at, expires_at, created_at, updated_at")
        .eq("org_id", orgId),

      supabase
        .from("payment_proofs")
        .select("amount, subscription_id, created_at, subscriptions!inner(plan_id)")
        .eq("status", "approved")
        .eq("org_id", orgId)
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString()),
    ]);

    const plans = plansRes.data ?? [];
    const subs = subsRes.data ?? [];
    const payments = paymentsRes.data ?? [];

    const report: MembershipReport[] = plans.map((plan) => {
      const planSubs = subs.filter((s) => s.plan_id === plan.id);
      const activeCount = planSubs.filter((s) => s.status === "active").length;

      // Ingresos de este plan en el período
      const planPayments = payments.filter((pp) => {
        const s = Array.isArray(pp.subscriptions) ? pp.subscriptions[0] : pp.subscriptions;
        return s?.plan_id === plan.id;
      });
      const revenueThisMonth = planPayments.reduce(
        (sum, pp) => sum + Number(pp.amount ?? plan.price),
        0
      );

      // Retención promedio en días (subs con starts_at definido)
      const withDates = planSubs.filter((s) => s.starts_at && s.expires_at);
      const avgRetention =
        withDates.length > 0
          ? Math.round(
              withDates.reduce((sum, s) => {
                const days = Math.ceil(
                  (new Date(s.expires_at).getTime() - new Date(s.starts_at).getTime()) /
                    86400000
                );
                return sum + days;
              }, 0) / withDates.length
            )
          : 0;

      const newThisMonth = planSubs.filter(
        (s) => new Date(s.created_at) >= from && new Date(s.created_at) <= to
      ).length;

      const cancelledThisMonth = planSubs.filter(
        (s) =>
          (s.status === "cancelled" || s.status === "expired") &&
          new Date(s.updated_at) >= from &&
          new Date(s.updated_at) <= to
      ).length;

      return {
        plan_name: plan.name,
        active_count: activeCount,
        revenue_this_month: revenueThisMonth,
        avg_retention_days: avgRetention,
        new_this_month: newThisMonth,
        cancelled_this_month: cancelledThisMonth,
      };
    });

    return { success: true, data: report };
  } catch (error) {
    console.error("[getMembershipReport] Error:", error);
    return { success: false, error: "Error al cargar el reporte de membresías." };
  }
}

// ─── getAttendanceReport ──────────────────────────────────────────────────────

export async function getAttendanceReport(
  period: OwnerPeriod
): Promise<ActionResult<AttendanceReport[]>> {
  const auth = await requireOwner();
  if (!auth) return { success: false, error: "Acceso denegado" };

  const supabase = await createClient();
  const orgId = await getOrgId();
  const { from, to } = getPeriodRange(period);

  try {
    const { data, error } = await supabase
      .from("gym_attendance_logs")
      .select("user_id, check_in_at")
      .eq("org_id", orgId)
      .gte("check_in_at", from.toISOString())
      .lte("check_in_at", to.toISOString())
      .order("check_in_at");

    if (error) throw error;

    // Agrupar por fecha en memoria — evita necesitar una RPC adicional
    const byDate = new Map<string, { users: Set<string>; hours: number[] }>();

    for (const log of data ?? []) {
      const date = log.check_in_at.split("T")[0];
      const hour = new Date(log.check_in_at).getHours();

      if (!byDate.has(date)) {
        byDate.set(date, { users: new Set(), hours: [] });
      }
      const entry = byDate.get(date)!;
      entry.users.add(log.user_id);
      entry.hours.push(hour);
    }

    const report: AttendanceReport[] = Array.from(byDate.entries()).map(([date, entry]) => {
      // Calcular peak_hour como la hora con más entradas
      const hourCounts = entry.hours.reduce<Record<number, number>>((acc, h) => {
        acc[h] = (acc[h] ?? 0) + 1;
        return acc;
      }, {});
      const peakHour = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0];

      return {
        date,
        total_visits: entry.hours.length,
        unique_members: entry.users.size,
        peak_hour: peakHour ? parseInt(peakHour[0]) : 0,
      };
    });

    return { success: true, data: report.sort((a, b) => a.date.localeCompare(b.date)) };
  } catch (error) {
    console.error("[getAttendanceReport] Error:", error);
    return { success: false, error: "Error al cargar el reporte de asistencia." };
  }
}

// ─── getSalesReport ───────────────────────────────────────────────────────────

export async function getSalesReport(
  period: OwnerPeriod
): Promise<ActionResult<SalesReport[]>> {
  const auth = await requireOwner();
  if (!auth) return { success: false, error: "Acceso denegado" };

  const supabase = await createClient();
  const orgId = await getOrgId();
  const { from, to } = getPeriodRange(period);

  try {
    const { data, error } = await supabase
      .from("gym_sales")
      .select(`
        id,
        created_at,
        items:gym_sale_items(
          quantity,
          unit_price,
          subtotal,
          product:gym_inventory_products(id, name, category, cost_price)
        )
      `)
      .eq("org_id", orgId)
      .gte("created_at", from.toISOString())
      .lte("created_at", to.toISOString());

    if (error) throw error;

    // Agregar por producto en memoria
    const productMap = new Map<string, SalesReport>();

    for (const sale of data ?? []) {
      for (const item of sale.items ?? []) {
        const prod = Array.isArray(item.product) ? item.product[0] : item.product;
        if (!prod) continue;

        const productId = (prod as { id: string }).id;
        const revenue = Number(item.subtotal);
        const cost = Number((prod as { cost_price: number }).cost_price) * item.quantity;
        const profit = revenue - cost;

        const existing = productMap.get(productId);
        if (existing) {
          existing.units_sold += item.quantity;
          existing.revenue += revenue;
          existing.cost += cost;
          existing.profit += profit;
          existing.profit_margin_pct =
            existing.revenue > 0
              ? Math.round((existing.profit / existing.revenue) * 100 * 10) / 10
              : 0;
        } else {
          productMap.set(productId, {
            product_id: productId,
            product_name: (prod as { name: string }).name,
            category: (prod as { category: string }).category,
            units_sold: item.quantity,
            revenue,
            cost,
            profit,
            profit_margin_pct: revenue > 0 ? Math.round((profit / revenue) * 100 * 10) / 10 : 0,
          });
        }
      }
    }

    const report = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue);
    return { success: true, data: report };
  } catch (error) {
    console.error("[getSalesReport] Error:", error);
    return { success: false, error: "Error al cargar el reporte de ventas." };
  }
}

// ─── getRevenueComparison ─────────────────────────────────────────────────────

export async function getRevenueComparison(): Promise<ActionResult<RevenueComparison>> {
  const auth = await requireOwner();
  if (!auth) return { success: false, error: "Acceso denegado" };

  const supabase = await createClient();
  const orgId = await getOrgId();
  const now = new Date();

  // Rangos: mes actual, mes anterior, mismo mes año pasado
  const currentFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentTo = new Date(now);
  currentTo.setHours(23, 59, 59, 999);

  const prevFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevTo = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const lastYearFrom = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  const lastYearTo = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0, 23, 59, 59, 999);

  try {
    const [currentPayments, prevPayments, lastYearPayments, currentSales, prevSales, lastYearSales] =
      await Promise.all([
        supabase
          .from("payment_proofs")
          .select("amount, subscriptions!inner(plan_id, membership_plans!inner(price))")
          .eq("status", "approved")
          .eq("org_id", orgId)
          .gte("created_at", currentFrom.toISOString())
          .lte("created_at", currentTo.toISOString()),

        supabase
          .from("payment_proofs")
          .select("amount")
          .eq("status", "approved")
          .eq("org_id", orgId)
          .gte("created_at", prevFrom.toISOString())
          .lte("created_at", prevTo.toISOString()),

        supabase
          .from("payment_proofs")
          .select("amount")
          .eq("status", "approved")
          .eq("org_id", orgId)
          .gte("created_at", lastYearFrom.toISOString())
          .lte("created_at", lastYearTo.toISOString()),

        supabase
          .from("gym_sales")
          .select("total_amount")
          .eq("org_id", orgId)
          .gte("created_at", currentFrom.toISOString())
          .lte("created_at", currentTo.toISOString()),

        supabase
          .from("gym_sales")
          .select("total_amount")
          .eq("org_id", orgId)
          .gte("created_at", prevFrom.toISOString())
          .lte("created_at", prevTo.toISOString()),

        supabase
          .from("gym_sales")
          .select("total_amount")
          .eq("org_id", orgId)
          .gte("created_at", lastYearFrom.toISOString())
          .lte("created_at", lastYearTo.toISOString()),
      ]);

    const sumPayments = (rows: Array<{ amount: number | null }>) =>
      rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);
    const sumSales = (rows: Array<{ total_amount: number }>) =>
      rows.reduce((s, r) => s + Number(r.total_amount), 0);

    const currentMembership = sumPayments(currentPayments.data ?? []);
    const currentSalesTotal = sumSales(currentSales.data ?? []);

    return {
      success: true,
      data: {
        current_month: currentMembership + currentSalesTotal,
        previous_month:
          sumPayments(prevPayments.data ?? []) + sumSales(prevSales.data ?? []),
        same_month_last_year:
          sumPayments(lastYearPayments.data ?? []) + sumSales(lastYearSales.data ?? []),
        membership_breakdown: currentMembership,
        sales_breakdown: currentSalesTotal,
      },
    };
  } catch (error) {
    console.error("[getRevenueComparison] Error:", error);
    return { success: false, error: "Error al cargar la comparativa de ingresos." };
  }
}
