// RegisterSaleModal.tsx — Modal de punto de venta con carrito para registrar ventas desde admin

"use client";

import { useState, useTransition, useDeferredValue } from "react";
import { Loader2, X, ShoppingCart, Plus, Minus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { registerSale } from "@/actions/inventory.actions";
import type { InventoryProduct, SaleCartItem, SalePaymentMethod } from "@/types/gym-inventory";

interface Member {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface RegisterSaleModalProps {
  open: boolean;
  onClose: () => void;
  products: InventoryProduct[];
  members: Member[];
}

const PAYMENT_METHODS: { value: SalePaymentMethod; label: string }[] = [
  { value: "cash",  label: "Efectivo" },
  { value: "card",  label: "Tarjeta" },
  { value: "sinpe", label: "SINPE" },
  { value: "other", label: "Otro" },
];

function formatPrice(n: number): string {
  return `₡${n.toLocaleString("es-CR")}`;
}

export function RegisterSaleModal({ open, onClose, products, members }: RegisterSaleModalProps): React.ReactNode {
  const [isPending, startTransition] = useTransition();
  const [cart, setCart] = useState<SaleCartItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberDropdown, setMemberDropdown] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const deferredProductSearch = useDeferredValue(productSearch);
  const deferredMemberSearch = useDeferredValue(memberSearch);

  const availableProducts = products.filter(
    (p) => p.is_active && p.current_stock > 0 &&
      (!deferredProductSearch || p.name.toLowerCase().includes(deferredProductSearch.toLowerCase()))
  );

  const filteredMembers = deferredMemberSearch
    ? members.filter(
        (m) =>
          m.full_name?.toLowerCase().includes(deferredMemberSearch.toLowerCase()) ||
          m.email?.toLowerCase().includes(deferredMemberSearch.toLowerCase())
      ).slice(0, 6)
    : members.slice(0, 6);

  const total = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  const addToCart = (product: InventoryProduct) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        // No superar el stock disponible
        if (existing.quantity >= product.current_stock) return prev;
        return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1, unit_price: product.sale_price }];
    });
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    setCart((prev) => prev.map((i) => i.product.id === productId ? { ...i, quantity: qty } : i));
  };

  const updatePrice = (productId: string, price: number) => {
    setCart((prev) => prev.map((i) => i.product.id === productId ? { ...i, unit_price: price } : i));
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const handleClose = () => {
    setCart([]);
    setProductSearch("");
    setMemberSearch("");
    setSelectedMember(null);
    setMemberDropdown(false);
    setPaymentMethod("cash");
    setNotes("");
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    if (cart.length === 0) return;
    setError(null);

    startTransition(async () => {
      const result = await registerSale({
        items: cart.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
        payment_method: paymentMethod,
        member_id: selectedMember?.id,
        notes: notes || undefined,
      });

      if (!result.success) {
        setError(typeof result.error === "string" ? result.error : "Error al registrar la venta");
        return;
      }

      toast.success(`Venta registrada — Total: ${formatPrice(total)}`);
      handleClose();
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #1e1e1e" }}>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#FF5E14]" />
            <h2 className="text-lg font-bold text-white font-barlow">Registrar Venta</h2>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-[#737373] hover:text-white hover:bg-[#1a1a1a] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body — 2 columnas */}
        <div className="flex-1 overflow-hidden flex min-h-0">
          {/* Columna izquierda — Catálogo */}
          <div className="w-1/2 flex flex-col" style={{ borderRight: "1px solid #1e1e1e" }}>
            <div className="px-4 py-3" style={{ borderBottom: "1px solid #1e1e1e" }}>
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-[#444] outline-none focus:ring-1 focus:ring-[#FF5E14]"
                style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {availableProducts.length === 0 ? (
                <p className="text-center text-[#444] text-xs py-6">Sin productos disponibles</p>
              ) : (
                availableProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addToCart(p)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer hover:bg-[#1a1a1a]"
                    style={{ border: "1px solid transparent" }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{p.name}</p>
                      <p className="text-[11px] text-[#555]">Stock: {p.current_stock}</p>
                    </div>
                    <span className="text-sm font-semibold shrink-0 ml-2" style={{ color: "#FF5E14" }}>
                      {formatPrice(p.sale_price)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Columna derecha — Carrito */}
          <div className="w-1/2 flex flex-col">
            {/* Items del carrito */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[#333] py-6">
                  <ShoppingCart className="w-8 h-8 mb-2" />
                  <p className="text-xs">Agrega productos al carrito</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="rounded-lg p-2.5 space-y-2"
                    style={{ backgroundColor: "#0D0D0D", border: "1px solid #1e1e1e" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-white flex-1 truncate">{item.product.name}</p>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-[#444] hover:text-red-400 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Cantidad */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-[#737373] hover:text-white hover:bg-[#2a2a2a] transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-medium text-white w-6 text-center">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          disabled={item.quantity >= item.product.current_stock}
                          className="w-6 h-6 rounded flex items-center justify-center text-[#737373] hover:text-white hover:bg-[#2a2a2a] transition-colors disabled:opacity-40"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Precio unitario editable */}
                      <div className="relative flex-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-[#555]">₡</span>
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updatePrice(item.product.id, parseFloat(e.target.value) || 0)}
                          min={0}
                          className="w-full pl-5 pr-2 py-1 rounded text-xs text-white outline-none focus:ring-1 focus:ring-[#FF5E14]"
                          style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
                        />
                      </div>

                      {/* Subtotal */}
                      <span className="text-xs font-semibold shrink-0" style={{ color: "#F5F5F5" }}>
                        {formatPrice(item.unit_price * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Total + opciones */}
            <div className="px-3 py-3 space-y-3" style={{ borderTop: "1px solid #1e1e1e" }}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#737373]">Total</span>
                <span className="text-xl font-bold font-barlow text-white">{formatPrice(total)}</span>
              </div>

              {/* Método de pago */}
              <div className="grid grid-cols-4 gap-1">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPaymentMethod(m.value)}
                    className="py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    style={{
                      backgroundColor: paymentMethod === m.value ? "rgba(255,94,20,0.2)" : "#1a1a1a",
                      border: `1px solid ${paymentMethod === m.value ? "#FF5E14" : "#2a2a2a"}`,
                      color: paymentMethod === m.value ? "#FF5E14" : "#737373",
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Miembro (combobox) */}
              <div className="relative">
                <input
                  value={selectedMember ? selectedMember.full_name ?? "" : memberSearch}
                  onChange={(e) => {
                    if (selectedMember) setSelectedMember(null);
                    setMemberSearch(e.target.value);
                    setMemberDropdown(true);
                  }}
                  onFocus={() => setMemberDropdown(true)}
                  placeholder="Cliente (opcional)"
                  className="w-full px-3 py-1.5 rounded-lg text-xs text-white placeholder-[#444] outline-none focus:ring-1 focus:ring-[#FF5E14]"
                  style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
                />
                {memberDropdown && filteredMembers.length > 0 && !selectedMember && (
                  <div
                    className="absolute bottom-full mb-1 left-0 right-0 rounded-lg overflow-hidden z-10"
                    style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
                  >
                    {filteredMembers.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-xs text-white hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedMember(m);
                          setMemberSearch("");
                          setMemberDropdown(false);
                        }}
                      >
                        {m.full_name ?? m.email}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Notas */}
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={1}
                placeholder="Notas (opcional)"
                className="w-full px-3 py-1.5 rounded-lg text-xs text-white placeholder-[#444] outline-none focus:ring-1 focus:ring-[#FF5E14] resize-none"
                style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
              />

              {error && <p className="text-xs text-red-400">{error}</p>}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || cart.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#FF5E14" }}
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmar venta
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
