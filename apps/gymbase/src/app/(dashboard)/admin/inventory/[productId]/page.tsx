// page.tsx — Detalle de producto con historial de movimientos y acciones rápidas

import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getProductById } from "@/actions/inventory.actions";
import { MovementHistory } from "@/components/gym/inventory/MovementHistory";
import { ProductDetailActions } from "@/components/gym/inventory/ProductDetailActions";

const CATEGORY_LABELS: Record<string, string> = {
  supplement: "Suplementos",
  apparel:    "Ropa",
  equipment:  "Equipamiento",
  food_drink: "Bebidas/Snacks",
  other:      "Otro",
};

function formatPrice(n: number): string {
  return `₡${n.toLocaleString("es-CR")}`;
}

interface PageProps {
  params: Promise<{ productId: string }>;
}

export default async function ProductDetailPage({ params }: PageProps): Promise<React.ReactNode> {
  const { productId } = await params;
  const result = await getProductById(productId);

  if (!result.success || !result.data) return notFound();

  const { product, movements } = result.data;

  const margin = product.sale_price > 0
    ? ((product.sale_price - product.cost_price) / product.sale_price) * 100
    : 0;
  const marginColor = margin > 30 ? "#22c55e" : margin >= 10 ? "#facc15" : "#ef4444";

  const stockColor = product.current_stock <= product.min_stock_alert
    ? "#ef4444"
    : product.current_stock <= product.min_stock_alert * 2
    ? "#facc15"
    : "#22c55e";

  return (
    <div className="p-6 space-y-6">
      {/* Back link + header */}
      <div className="flex items-start gap-4">
        <Link
          href="/admin/inventory"
          className="mt-1 p-2 rounded-lg text-[#737373] hover:text-white hover:bg-[#1a1a1a] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-[28px] font-bold text-white font-barlow tracking-tight leading-none">
              {product.name}
            </h1>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "rgba(255,94,20,0.12)", color: "#FF5E14", border: "1px solid rgba(255,94,20,0.2)" }}
            >
              {CATEGORY_LABELS[product.category] ?? product.category}
            </span>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: product.is_active ? "rgba(34,197,94,0.1)" : "rgba(100,100,100,0.1)",
                color: product.is_active ? "#22c55e" : "#555",
                border: `1px solid ${product.is_active ? "rgba(34,197,94,0.2)" : "#2a2a2a"}`,
              }}
            >
              {product.is_active ? "Activo" : "Inactivo"}
            </span>
          </div>
          {product.sku && <p className="text-xs text-[#444] mt-1">SKU: {product.sku}</p>}
        </div>
      </div>

      {/* Grid 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna izquierda — Info */}
        <div className="space-y-4">
          {/* Stock prominente */}
          <div className="rounded-2xl p-5" style={{ backgroundColor: "#111111", border: "1px solid #1e1e1e" }}>
            <p className="text-xs text-[#555] uppercase tracking-wider mb-2">Stock actual</p>
            <p className="text-5xl font-bold font-barlow" style={{ color: stockColor }}>
              {product.current_stock}
            </p>
            <p className="text-sm text-[#444] mt-1">
              Mínimo de alerta: {product.min_stock_alert} unidades
            </p>
            {product.current_stock <= product.min_stock_alert && (
              <p className="text-xs text-red-400 mt-2 font-medium">⚠️ Stock bajo — requiere reabastecimiento</p>
            )}
          </div>

          {/* Detalles del producto */}
          <div className="rounded-2xl p-5 space-y-3" style={{ backgroundColor: "#111111", border: "1px solid #1e1e1e" }}>
            <h3 className="text-sm font-semibold text-white mb-3">Detalles</h3>

            {product.description && (
              <div>
                <p className="text-xs text-[#555] mb-1">Descripción</p>
                <p className="text-sm text-[#A0A0A0]">{product.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <p className="text-xs text-[#555] mb-0.5">Unidad</p>
                <p className="text-sm text-white capitalize">{product.unit}</p>
              </div>
              <div>
                <p className="text-xs text-[#555] mb-0.5">Categoría</p>
                <p className="text-sm text-white">{CATEGORY_LABELS[product.category]}</p>
              </div>
              <div>
                <p className="text-xs text-[#555] mb-0.5">Precio de Costo</p>
                <p className="text-sm text-white">{formatPrice(product.cost_price)}</p>
              </div>
              <div>
                <p className="text-xs text-[#555] mb-0.5">Precio de Venta</p>
                <p className="text-sm font-semibold text-white">{formatPrice(product.sale_price)}</p>
              </div>
              <div>
                <p className="text-xs text-[#555] mb-0.5">Margen</p>
                <p className="text-sm font-bold" style={{ color: marginColor }}>{margin.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Acciones client-side */}
          <ProductDetailActions product={product} />
        </div>

        {/* Columna derecha — Historial */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "#111111", border: "1px solid #1e1e1e" }}>
          <h3 className="text-sm font-semibold text-white mb-4">Historial de Movimientos</h3>
          <MovementHistory movements={movements} />
        </div>
      </div>
    </div>
  );
}
