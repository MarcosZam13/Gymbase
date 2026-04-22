// StockAdjustmentForm.tsx — Dialog para ajustar el stock de un producto con preview en tiempo real

"use client";

import { useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { adjustStock } from "@/actions/inventory.actions";
import type { InventoryProduct } from "@/types/gym-inventory";

type AdjustmentType = "restock" | "adjustment" | "waste";

const TYPES: { value: AdjustmentType; icon: string; label: string; note: string }[] = [
  { value: "restock",    icon: "📦", label: "Restock",  note: "Ej: Compra a proveedor" },
  { value: "adjustment", icon: "🔧", label: "Ajuste",   note: "Ej: Corrección de inventario" },
  { value: "waste",      icon: "🗑️", label: "Merma",    note: "Ej: Producto vencido o dañado" },
];

interface StockAdjustmentFormProps {
  open: boolean;
  onClose: () => void;
  product: InventoryProduct;
}

export function StockAdjustmentForm({ open, onClose, product }: StockAdjustmentFormProps): React.ReactNode {
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<AdjustmentType>("restock");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const qty = parseInt(quantity, 10) || 0;
  const delta = type === "restock" ? qty : -qty;
  const resultStock = product.current_stock + delta;
  const isNegative = resultStock < 0;

  const selectedType = TYPES.find((t) => t.value === type)!;

  const handleClose = () => {
    setType("restock");
    setQuantity("");
    setNotes("");
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNegative || qty <= 0) return;
    setError(null);

    startTransition(async () => {
      const result = await adjustStock({ productId: product.id, type, quantity: qty, notes: notes || undefined });
      if (!result.success) {
        setError(typeof result.error === "string" ? result.error : "Error al ajustar el stock");
        return;
      }
      toast.success("Stock actualizado correctamente");
      handleClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #1e1e1e" }}>
          <div>
            <h2 className="text-base font-bold text-white font-barlow">Ajustar Stock</h2>
            <p className="text-xs text-[#737373] mt-0.5">{product.name}</p>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-[#737373] hover:text-white hover:bg-[#1a1a1a] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Stock actual prominente */}
          <div className="text-center py-3 rounded-xl" style={{ backgroundColor: "#0D0D0D", border: "1px solid #1e1e1e" }}>
            <p className="text-xs text-[#555] mb-1">Stock actual</p>
            <p className="text-3xl font-bold font-barlow" style={{ color: "#F5F5F5" }}>
              {product.current_stock}
            </p>
            <p className="text-xs text-[#555] mt-0.5">{product.unit === "unit" ? "unidades" : product.unit}</p>
          </div>

          {/* Tipo de movimiento */}
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl text-center transition-all cursor-pointer"
                style={{
                  backgroundColor: type === t.value ? "rgba(255,94,20,0.15)" : "#0D0D0D",
                  border: `1px solid ${type === t.value ? "#FF5E14" : "#1e1e1e"}`,
                  color: type === t.value ? "#FF5E14" : "#737373",
                }}
              >
                <span className="text-lg">{t.icon}</span>
                <span className="text-xs font-medium">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Cantidad */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[#737373]">Cantidad *</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              min={1}
              placeholder="0"
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none focus:ring-1 focus:ring-[#FF5E14]"
              style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
            />
          </div>

          {/* Preview de stock resultante */}
          {qty > 0 && (
            <div
              className="flex items-center justify-between px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: isNegative ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.08)",
                border: `1px solid ${isNegative ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.2)"}`,
              }}
            >
              <span style={{ color: "#737373" }}>Stock resultante:</span>
              <span className="font-bold" style={{ color: isNegative ? "#ef4444" : "#22c55e" }}>
                {resultStock} {isNegative ? "⚠️ Insuficiente" : ""}
              </span>
            </div>
          )}

          {/* Notas */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-[#737373]">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder={selectedType.note}
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-[#444] outline-none focus:ring-1 focus:ring-[#FF5E14] resize-none"
              style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          {/* Acciones */}
          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[#737373] hover:text-white hover:bg-[#1a1a1a] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || isNegative || qty <= 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#FF5E14" }}
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Confirmar ajuste
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
