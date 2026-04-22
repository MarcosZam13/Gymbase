// inventory.ts — Zod schemas para validación de inventario y ventas

import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  sku: z.string().optional(),
  category: z.enum(['supplement', 'apparel', 'equipment', 'food_drink', 'other']),
  unit: z.enum(['unit', 'kg', 'liter', 'pack']),
  cost_price: z.number().min(0),
  sale_price: z.number().min(0),
  initial_stock: z.number().int().min(0).default(0),
  min_stock_alert: z.number().int().min(0).default(5),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  sku: z.string().optional(),
  category: z.enum(['supplement', 'apparel', 'equipment', 'food_drink', 'other']).optional(),
  unit: z.enum(['unit', 'kg', 'liter', 'pack']).optional(),
  cost_price: z.number().min(0).optional(),
  sale_price: z.number().min(0).optional(),
  min_stock_alert: z.number().int().min(0).optional(),
  image_url: z.string().url().optional().nullable(),
  is_active: z.boolean().optional(),
});

export const adjustStockSchema = z.object({
  productId: z.string().uuid(),
  type: z.enum(['restock', 'adjustment', 'waste']),
  // Siempre positivo en el form; el action calcula el signo según el tipo
  quantity: z.number().int().min(1),
  notes: z.string().optional(),
});

export const registerSaleSchema = z.object({
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().min(1),
    unit_price: z.number().min(0),
  })).min(1),
  payment_method: z.enum(['cash', 'card', 'sinpe', 'other']),
  member_id: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type RegisterSaleInput = z.infer<typeof registerSaleSchema>;
