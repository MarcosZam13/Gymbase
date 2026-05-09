// dashboard/page.tsx — Dashboard principal del owner con KPIs de revenue, cashflow y top productos

import { Suspense } from "react";
import { DollarSign, Users, ShoppingBag, TrendingDown } from "lucide-react";
import { getOwnerDashboardStats, getCashFlow } from "@/actions/owner.actions";
import { StatCard } from "@/components/owner/StatCard";
import { CashFlowChart } from "@/components/owner/CashFlowChart";
import { PeriodSelector } from "@/components/owner/PeriodSelector";
import { themeConfig } from "@/lib/theme";
import type { OwnerPeriod } from "@/types/owner";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: themeConfig.payment.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function calcDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

interface PageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function OwnerDashboardPage({
  searchParams,
}: PageProps): Promise<React.ReactElement> {
  const params = await searchParams;
  const period: OwnerPeriod =
    params.period === "week" || params.period === "year" ? params.period : "month";

  const [statsResult, cashFlowResult] = await Promise.all([
    getOwnerDashboardStats(period),
    getCashFlow(period),
  ]);

  const stats = statsResult.success ? statsResult.data! : null;
  const cashFlow = cashFlowResult.success ? cashFlowResult.data! : [];

  const net = stats?.revenue.net ?? 0;
  const netPositive = net >= 0;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-barlow font-bold text-3xl text-white tracking-wide uppercase">
            Dashboard
          </h1>
          <p className="text-[#737373] text-sm mt-1">Resumen ejecutivo del negocio</p>
        </div>
        <Suspense>
          <PeriodSelector current={period} />
        </Suspense>
      </div>

      {/* KPI Cards — ingresos y egresos del período */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard
          label="Ingresos totales"
          value={stats ? formatCurrency(stats.revenue.current) : "—"}
          delta={stats ? calcDelta(stats.revenue.current, stats.revenue.previous) : null}
          icon={<DollarSign size={16} />}
          highlight
        />
        <StatCard
          label="Membresías"
          value={stats ? formatCurrency(stats.revenue.membership) : "—"}
          icon={<Users size={16} />}
        />
        <StatCard
          label="Ventas tienda"
          value={stats ? formatCurrency(stats.revenue.sales) : "—"}
          icon={<ShoppingBag size={16} />}
        />
        <StatCard
          label="Egresos del período"
          value={stats ? formatCurrency(stats.revenue.expenses) : "—"}
          icon={<TrendingDown size={16} />}
        />
      </div>

      {/* Fila secundaria — miembros y net del período */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4 text-center">
            <p className="font-barlow font-bold text-2xl text-white">{stats.members.active}</p>
            <p className="text-xs text-[#737373] mt-1">Miembros activos</p>
          </div>
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4 text-center">
            <p className="font-barlow font-bold text-2xl text-green-400">
              +{stats.members.new_this_period}
            </p>
            <p className="text-xs text-[#737373] mt-1">Nuevos este período</p>
          </div>
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4 text-center">
            <p className="font-barlow font-bold text-2xl text-yellow-400">
              {stats.members.expiring_soon}
            </p>
            <p className="text-xs text-[#737373] mt-1">Vencen próximos 7d</p>
          </div>
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4 text-center">
            <p
              className={`font-barlow font-bold text-2xl ${netPositive ? "text-green-400" : "text-red-400"}`}
            >
              {formatCurrency(net)}
            </p>
            <p className="text-xs text-[#737373] mt-1">Net del período</p>
          </div>
        </div>
      )}

      {/* Cashflow Chart */}
      <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-6 mb-8">
        <h2 className="font-barlow font-semibold text-lg text-white uppercase tracking-wide mb-4">
          Flujo de caja
        </h2>
        <CashFlowChart data={cashFlow} currency={themeConfig.payment.currency} />
      </div>

      {/* Segunda fila: ingresos por fuente + top productos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Desglose de ingresos */}
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-6">
          <h2 className="font-barlow font-semibold text-lg text-white uppercase tracking-wide mb-4">
            Desglose de ingresos
          </h2>
          {stats ? (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-[#737373]">Membresías</span>
                  <span className="text-white font-medium">
                    {formatCurrency(stats.revenue.membership)}
                  </span>
                </div>
                <div className="h-2 bg-[#1E1E1E] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#FF5E14] rounded-full"
                    style={{
                      width: `${stats.revenue.current > 0 ? (stats.revenue.membership / stats.revenue.current) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-[#737373]">Ventas de productos</span>
                  <span className="text-white font-medium">
                    {formatCurrency(stats.revenue.sales)}
                  </span>
                </div>
                <div className="h-2 bg-[#1E1E1E] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{
                      width: `${stats.revenue.current > 0 ? (stats.revenue.sales / stats.revenue.current) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-[#1E1E1E] flex justify-between">
                <span className="text-[#737373] text-sm">Total ingresos</span>
                <span className="text-white font-bold">{formatCurrency(stats.revenue.current)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#737373] text-sm">Egresos</span>
                <span className="text-red-400 font-semibold">
                  − {formatCurrency(stats.revenue.expenses)}
                </span>
              </div>
              <div className="pt-3 border-t border-[#1E1E1E] flex justify-between">
                <span className="text-[#737373] text-sm font-medium">Net</span>
                <span
                  className={`font-bold ${stats.revenue.net >= 0 ? "text-green-400" : "text-red-400"}`}
                >
                  {formatCurrency(stats.revenue.net)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-[#737373] text-sm">Error al cargar los datos</p>
          )}
        </div>

        {/* Top productos */}
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-6">
          <h2 className="font-barlow font-semibold text-lg text-white uppercase tracking-wide mb-4">
            Top productos vendidos
          </h2>
          {stats && stats.inventory.top_products.length > 0 ? (
            <div className="space-y-3">
              {stats.inventory.top_products.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#FF5E14]/15 text-[#FF5E14] text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{p.name}</p>
                    <p className="text-xs text-[#737373]">{p.units_sold} uds vendidas</p>
                  </div>
                  <span className="text-sm font-medium text-[#FF5E14] flex-shrink-0">
                    {formatCurrency(p.revenue)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#737373] text-sm">Sin ventas en el período</p>
          )}
        </div>
      </div>

      {/* Fila de estado de asistencia */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4 text-center">
            <p className="font-barlow font-bold text-2xl text-red-400">
              {stats.members.churned_this_period}
            </p>
            <p className="text-xs text-[#737373] mt-1">Abandonos</p>
          </div>
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4 text-center">
            <p className="font-barlow font-bold text-2xl text-[#FF5E14]">
              {stats.attendance.total_visits}
            </p>
            <p className="text-xs text-[#737373] mt-1">
              Visitas ({stats.attendance.avg_daily.toFixed(1)}/día)
            </p>
          </div>
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-xl p-4 text-center">
            <p className="font-barlow font-bold text-2xl text-white">
              {stats.attendance.unique_members}
            </p>
            <p className="text-xs text-[#737373] mt-1">Miembros únicos asistieron</p>
          </div>
        </div>
      )}
    </div>
  );
}
