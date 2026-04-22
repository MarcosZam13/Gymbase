// ProductForm.tsx — Sheet lateral para crear o editar un producto de inventario

"use client";

import { useState, useTransition, useEffect } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createProduct, updateProduct } from "@/actions/inventory.actions";
import type { InventoryProduct, ProductCategory, ProductUnit } from "@/types/gym-inventory";

const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: "supplement", label: "Suplementos" },
  { value: "apparel",    label: "Ropa" },
  { value: "equipment",  label: "Equipamiento" },
  { value: "food_drink", label: "Bebidas/Snacks" },
  { value: "other",      label: "Otro" },
];

const UNITS: { value: ProductUnit; label: string }[] = [
  { value: "unit", label: "Por unidad" },
  { value: "kg",   label: "Por kg" },
  { value: "liter",label: "Por litro" },
  { value: "pack", label: "Por paquete" },
];

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  product?: InventoryProduct | null;
}

function computeMargin(cost: number, sale: number): number | null {
  if (!sale || sale <= 0) return null;
  return ((sale - cost) / sale) * 100;
}

export function ProductForm({ open, onClose, product }: ProductFormProps): React.ReactNode {
  const isEdit = !!product;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName]               = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [sku, setSku]                 = useState(product?.sku ?? "");
  const [category, setCategory]       = useState<ProductCategory>(product?.category ?? "supplement");
  const [unit, setUnit]               = useState<ProductUnit>(product?.unit ?? "unit");
  const [costPrice, setCostPrice]     = useState(product?.cost_price?.toString() ?? "");
  const [salePrice, setSalePrice]     = useState(product?.sale_price?.toString() ?? "");
  const [minStock, setMinStock]       = useState(product?.min_stock_alert?.toString() ?? "5");
  const [initialStock, setInitialStock] = useState("0");

  // Sincronizar campos cuando cambia el producto (modo edición)
  useEffect(() => {
    setName(product?.name ?? "");
    setDescription(product?.description ?? "");
    setSku(product?.sku ?? "");
    setCategory(product?.category ?? "supplement");
    setUnit(product?.unit ?? "unit");
    setCostPrice(product?.cost_price?.toString() ?? "");
    setSalePrice(product?.sale_price?.toString() ?? "");
    setMinStock(product?.min_stock_alert?.toString() ?? "5");
    setInitialStock("0");
    setError(null);
  }, [product]);

  const margin = computeMargin(parseFloat(costPrice) || 0, parseFloat(salePrice) || 0);
  const marginColor =
    margin === null ? "#555"
    : margin > 30 ? "#22c55e"
    : margin >= 10 ? "#facc15"
    : "#ef4444";

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    const payload = {
      name,
      description: description || undefined,
      sku: sku || undefined,
      category,
      unit,
      cost_price: parseFloat(costPrice),
      sale_price: parseFloat(salePrice),
      min_stock_alert: parseInt(minStock, 10) || 5,
      ...(!isEdit && { initial_stock: parseInt(initialStock, 10) || 0 }),
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateProduct(product!.id, payload)
        : await createProduct(payload);

      if (!result.success) {
        const msg = typeof result.error === "string" ? result.error : "Verifica los datos del formulario";
        setError(msg);
        return;
      }

      toast.success(isEdit ? "Producto actualizado" : "Producto creado");
      onClose();
    });
  };

  if (!open) return null;

  return (
    // Overlay
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Panel lateral */}
      <div
        className="relative w-full max-w-md h-full flex flex-col overflow-hidden"
        style={{ backgroundColor: "#111111", borderLeft: "1px solid #1e1e1e" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #1e1e1e" }}>
          <h2 className="text-lg font-bold text-white font-barlow">
            {isEdit ? "Editar Producto" : "Nuevo Producto"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#737373] hover:text-white hover:bg-[#1a1a1a] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario con scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && (
            <div className="text-sm text-red-400 bg-red-950/40 border border-red-900/40 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Nombre */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[#737373]">Nombre *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ej: Proteína Whey 2kg"
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-[#444] outline-none focus:ring-1 focus:ring-[#FF5E14]"
              style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
            />
          </div>

          {/* Descripción */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[#737373]">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Descripción opcional"
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-[#444] outline-none focus:ring-1 focus:ring-[#FF5E14] resize-none"
              style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
            />
          </div>

          {/* SKU */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[#737373]">SKU</label>
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="Opcional"
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-[#444] outline-none focus:ring-1 focus:ring-[#FF5E14]"
              style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
            />
          </div>

          {/* Categoría y Unidad en fila */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#737373]">Categoría *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none focus:ring-1 focus:ring-[#FF5E14]"
                style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#737373]">Unidad *</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as ProductUnit)}
                className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none focus:ring-1 focus:ring-[#FF5E14]"
                style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Precios en fila */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#737373]">Precio de Costo *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#555]">₡</span>
                <input
                  type="number"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  required
                  min={0}
                  step={1}
                  className="w-full pl-6 pr-3 py-2 rounded-lg text-sm text-white outline-none focus:ring-1 focus:ring-[#FF5E14]"
                  style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#737373]">Precio de Venta *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#555]">₡</span>
                <input
                  type="number"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  required
                  min={0}
                  step={1}
                  className="w-full pl-6 pr-3 py-2 rounded-lg text-sm text-white outline-none focus:ring-1 focus:ring-[#FF5E14]"
                  style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
                />
              </div>
            </div>
          </div>

          {/* Preview de margen en tiempo real */}
          {(costPrice || salePrice) && (
            <p className="text-xs font-medium" style={{ color: marginColor }}>
              Margen:{" "}
              {margin !== null
                ? `${margin.toFixed(1)}%`
                : "—"}
            </p>
          )}

          {/* Stock mínimo */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[#737373]">Stock mínimo de alerta</label>
            <input
              type="number"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              min={0}
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none focus:ring-1 focus:ring-[#FF5E14]"
              style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
            />
          </div>

          {/* Stock inicial — solo en modo crear */}
          {!isEdit && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#737373]">Stock inicial</label>
              <input
                type="number"
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
                min={0}
                className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none focus:ring-1 focus:ring-[#FF5E14]"
                style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
              />
            </div>
          )}
        </form>

        {/* Footer fijo */}
        <div className="px-5 py-4 flex gap-2 justify-end" style={{ borderTop: "1px solid #1e1e1e" }}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-[#737373] hover:text-white hover:bg-[#1a1a1a] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
            style={{ backgroundColor: "#FF5E14" }}
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? "Guardar cambios" : "Crear producto"}
          </button>
        </div>
      </div>
    </div>
  );
}
