// page.tsx — Dashboard de inventario: stats, alertas de stock bajo y tabla de productos

import { Package, AlertTriangle, TrendingUp } from "lucide-react";
import { getProducts, getLowStockCount, getInventoryStats } from "@/actions/inventory.actions";
import { ProductTable } from "@/components/gym/inventory/ProductTable";

function formatPrice(n: number): string {
  return `₡${n.toLocaleString("es-CR")}`;
}

export default async function AdminInventoryPage(): Promise<React.ReactNode> {
  const [productsResult, lowStockCount, statsResult] = await Promise.all([
    getProducts(),
    getLowStockCount(),
    getInventoryStats(),
  ]);

  const products = productsResult.success ? (productsResult.data ?? []) : [];
  const stats = statsResult.success ? statsResult.data : null;
  const lowStockProducts = products.filter((p) => p.current_stock <= p.min_stock_alert);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold text-white font-barlow tracking-tight leading-none">
            Inventario
          </h1>
          <p className="text-xs text-[#555] mt-1">
            {products.length} producto{products.length !== 1 ? "s" : ""} activo{products.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total productos */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: "#111111", border: "1px solid #1e1e1e" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(255,94,20,0.12)" }}>
              <Package className="w-4 h-4" style={{ color: "#FF5E14" }} />
            </div>
            <p className="text-xs font-medium text-[#737373] uppercase tracking-wider">Total Productos</p>
          </div>
          <p className="text-3xl font-bold font-barlow text-white">{stats?.total_products ?? products.length}</p>
        </div>

        {/* Valor en inventario */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: "#111111", border: "1px solid #1e1e1e" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "rgba(34,197,94,0.1)" }}>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-xs font-medium text-[#737373] uppercase tracking-wider">Valor en Inventario</p>
          </div>
          <p className="text-2xl font-bold font-barlow text-white">
            {stats ? formatPrice(stats.total_stock_value) : "—"}
          </p>
          {stats && (
            <p className="text-xs text-[#555] mt-1">Venta estimada: {formatPrice(stats.total_sale_value)}</p>
          )}
        </div>

        {/* Stock bajo */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: "#111111", border: "1px solid #1e1e1e" }}>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: lowStockCount > 0 ? "rgba(239,68,68,0.12)" : "rgba(100,100,100,0.08)" }}
            >
              <AlertTriangle
                className="w-4 h-4"
                style={{ color: lowStockCount > 0 ? "#ef4444" : "#444" }}
              />
            </div>
            <p className="text-xs font-medium text-[#737373] uppercase tracking-wider">Stock Bajo</p>
          </div>
          <p
            className="text-3xl font-bold font-barlow"
            style={{ color: lowStockCount > 0 ? "#ef4444" : "#555" }}
          >
            {lowStockCount}
          </p>
          <p className="text-xs mt-1" style={{ color: lowStockCount > 0 ? "#ef4444" : "#444" }}>
            {lowStockCount > 0 ? "producto(s) con alerta activa" : "Sin alertas"}
          </p>
        </div>
      </div>

      {/* Banner de alertas */}
      {lowStockCount > 0 && (
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.2)" }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-300">
                {lowStockCount} producto{lowStockCount !== 1 ? "s" : ""} con stock bajo
              </p>
              <div className="mt-2 space-y-1">
                {lowStockProducts.slice(0, 5).map((p) => (
                  <p key={p.id} className="text-xs text-amber-400/70">
                    • {p.name} — {p.current_stock}/{p.min_stock_alert} (mín.)
                  </p>
                ))}
                {lowStockProducts.length > 5 && (
                  <p className="text-xs text-amber-400/50">
                    + {lowStockProducts.length - 5} más…
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de productos */}
      <ProductTable initialProducts={products} initialOnlyLowStock={false} />
    </div>
  );
}
