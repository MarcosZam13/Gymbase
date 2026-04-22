// ProductDetailActions.tsx — Botones de editar/ajustar stock en página de detalle (client)

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, BarChart2 } from "lucide-react";
import { ProductForm } from "./ProductForm";
import { StockAdjustmentForm } from "./StockAdjustmentForm";
import type { InventoryProduct } from "@/types/gym-inventory";

interface ProductDetailActionsProps {
  product: InventoryProduct;
}

export function ProductDetailActions({ product }: ProductDetailActionsProps): React.ReactNode {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const handleClose = () => {
    setEditOpen(false);
    setAdjustOpen(false);
    router.refresh();
  };

  return (
    <>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="flex items-center gap-2 flex-1 justify-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", color: "#F5F5F5" }}
        >
          <Pencil className="w-4 h-4" />
          Editar Producto
        </button>
        <button
          type="button"
          onClick={() => setAdjustOpen(true)}
          className="flex items-center gap-2 flex-1 justify-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer text-white"
          style={{ backgroundColor: "#FF5E14" }}
        >
          <BarChart2 className="w-4 h-4" />
          Ajustar Stock
        </button>
      </div>

      <ProductForm open={editOpen} onClose={handleClose} product={product} />
      <StockAdjustmentForm open={adjustOpen} onClose={handleClose} product={product} />
    </>
  );
}
