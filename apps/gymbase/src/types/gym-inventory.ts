// gym-inventory.ts — Tipos para los módulos de Inventario (8) y Ventas/Marketplace (9)

export type ProductCategory = 'supplement' | 'apparel' | 'equipment' | 'food_drink' | 'other';
export type ProductUnit = 'unit' | 'kg' | 'liter' | 'pack';
export type MovementType = 'restock' | 'sale' | 'adjustment' | 'waste';
export type SalePaymentMethod = 'cash' | 'card' | 'sinpe' | 'other';

export interface InventoryProduct {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  sku: string | null;
  category: ProductCategory;
  unit: ProductUnit;
  cost_price: number;
  sale_price: number;
  current_stock: number;
  min_stock_alert: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  org_id: string;
  type: MovementType;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  unit_price: number | null;
  notes: string | null;
  sale_id: string | null;
  created_by: string;
  created_at: string;
  // joins opcionales
  product?: Pick<InventoryProduct, 'name' | 'unit'>;
  creator?: { full_name: string };
}

export interface Sale {
  id: string;
  org_id: string;
  sold_by: string;
  member_id: string | null;
  payment_method: SalePaymentMethod;
  total_amount: number;
  notes: string | null;
  created_at: string;
  // joins opcionales
  seller?: { full_name: string };
  member?: { full_name: string } | null;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  // join opcional
  product?: Pick<InventoryProduct, 'name' | 'unit'>;
}

// Estado temporal del carrito en el flujo de venta del admin
export interface SaleCartItem {
  product: InventoryProduct;
  quantity: number;
  unit_price: number; // el admin puede editar el precio al momento de venta
}

// Resumen por producto para el dashboard de contabilidad (Módulo 10)
export interface ProductSalesSummary {
  product_id: string;
  product_name: string;
  total_units_sold: number;
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
}

// Stats agregados para el dashboard de inventario
export interface InventoryStats {
  total_products: number;
  total_stock_value: number;    // SUM(current_stock * cost_price)
  total_sale_value: number;     // SUM(current_stock * sale_price)
  low_stock_count: number;
  top_selling_products: ProductSalesSummary[];
  total_sales_this_month: number;
  total_revenue_this_month: number;
}
