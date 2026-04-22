// page.tsx — Dashboard de ventas: stats del mes, historial y registro de nuevas ventas

import { ShoppingCart, TrendingUp, CreditCard } from "lucide-react";
import { getSales, getProducts, getInventoryStats } from "@/actions/inventory.actions";
import { getMembers } from "@core/actions/admin.actions";
import { SalesClient } from "@/components/gym/inventory/SalesClient";
import type { SalePaymentMethod } from "@/types/gym-inventory";

const METHOD_LABELS: Record<SalePaymentMethod, string> = {
  cash:  "Efectivo",
  card:  "Tarjeta",
  sinpe: "SINPE",
  other: "Otro",
};

function formatPrice(n: number): string {
  return `₡${n.toLocaleString("es-CR")}`;
}

export default async function AdminSalesPage(): Promise<React.ReactNode> {
  const [salesResult, productsResult, statsResult, allMembers] = await Promise.all([
    getSales(),
    getProducts(),
    getInventoryStats(),
    getMembers(),
  ]);

  const sales = salesResult.success ? (salesResult.data ?? []) : [];
  const products = productsResult.success ? (productsResult.data ?? []) : [];
  const stats = statsResult.success ? statsResult.data : null;

  const memberList = allMembers.map((m) => ({
    id: m.id,
    full_name: m.full_name,
    email: m.email,
  }));

  // Método de pago más usado este mes
  const methodCounts = sales.reduce<Record<SalePaymentMethod, number>>((acc, s) => {
    acc[s.payment_method] = (acc[s.payment_method] ?? 0) + 1;
    return acc;
  }, {} as Record<SalePaymentMethod, number>);

  const topMethod = Object.entries(methodCounts).sort(([, a], [, b]) => b - a)[0];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[26px] font-bold text-white font-barlow tracking-tight leading-none">Ventas</h1>
        <p className="text-xs text-[#555] mt-1">Historial de ventas y caja</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Ventas del mes */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: "#111111", border: "1px solid #1e1e1e" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(255,94,20,0.12)" }}>
              <ShoppingCart className="w-4 h-4" style={{ color: "#FF5E14" }} />
            </div>
            <p className="text-xs font-medium text-[#737373] uppercase tracking-wider">Ventas del mes</p>
          </div>
          <p className="text-3xl font-bold font-barlow text-white">
            {stats?.total_sales_this_month ?? sales.length}
          </p>
        </div>

        {/* Ingresos del mes */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: "#111111", border: "1px solid #1e1e1e" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(34,197,94,0.1)" }}>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-xs font-medium text-[#737373] uppercase tracking-wider">Ingresos del mes</p>
          </div>
          <p className="text-2xl font-bold font-barlow text-white">
            {stats ? formatPrice(stats.total_revenue_this_month) : "₡0"}
          </p>
        </div>

        {/* Método más usado */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: "#111111", border: "1px solid #1e1e1e" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(59,130,246,0.1)" }}>
              <CreditCard className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-xs font-medium text-[#737373] uppercase tracking-wider">Método más usado</p>
          </div>
          <p className="text-2xl font-bold font-barlow text-white">
            {topMethod ? METHOD_LABELS[topMethod[0] as SalePaymentMethod] : "—"}
          </p>
          {topMethod && (
            <p className="text-xs text-[#555] mt-1">{topMethod[1]} venta{topMethod[1] !== 1 ? "s" : ""}</p>
          )}
        </div>
      </div>

      {/* Tabla de ventas + modal de nueva venta */}
      <SalesClient sales={sales} products={products} members={memberList} />
    </div>
  );
}
