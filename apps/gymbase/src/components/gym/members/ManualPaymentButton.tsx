// ManualPaymentButton.tsx — Modal para registrar pagos presenciales con selección de plan

"use client";

import { useState, useTransition } from "react";
import { DollarSign, Loader2 } from "lucide-react";
import { renewManualSubscription } from "@/actions/payment.actions";
import { formatPrice } from "@/lib/utils";
import type { MembershipPlan } from "@/types/database";

interface ManualPaymentButtonProps {
  memberId: string;
  subscriptionId: string;
  currentPlanId: string;
  plans: MembershipPlan[];
}

const PAYMENT_METHODS = [
  { value: "cash",     label: "Efectivo" },
  { value: "card",     label: "Tarjeta" },
  { value: "transfer", label: "Transferencia" },
  { value: "other",    label: "Otro" },
] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

export function ManualPaymentButton({
  memberId,
  subscriptionId,
  currentPlanId,
  plans,
}: ManualPaymentButtonProps): React.ReactNode {
  const [open, setOpen] = useState(false);

  // Pre-seleccionar el plan actual del miembro
  const [selectedPlanId, setSelectedPlanId] = useState(currentPlanId);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? plans[0];

  // Monto editable, se actualiza automáticamente al cambiar el plan
  const [amount, setAmount] = useState(selectedPlan?.price.toString() ?? "");

  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find((p) => p.id === planId);
    if (plan) setAmount(plan.price.toString());
  };

  const handleOpen = () => {
    // Resetear al plan actual cada vez que se abre el modal
    setSelectedPlanId(currentPlanId);
    const current = plans.find((p) => p.id === currentPlanId);
    setAmount(current?.price.toString() ?? "");
    setMethod("cash");
    setNotes("");
    setError(null);
    setOpen(true);
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await renewManualSubscription({
        memberId,
        subscriptionId,
        planId: selectedPlanId,
        amount: parseFloat(amount),
        paymentMethod: method,
        notes: notes || undefined,
      });

      if (result.success) {
        setOpen(false);
      } else {
        setError(typeof result.error === "string" ? result.error : "Error al registrar");
      }
    });
  };

  return (
    <>
      {/* Botón trigger */}
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
        style={{
          backgroundColor: "#FF5E1415",
          color: "#FF5E14",
          border: "1px solid #FF5E1430",
        }}
      >
        <DollarSign className="w-3.5 h-3.5" />
        Registrar pago
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="bg-[#111] border border-[#1a1a1a] rounded-[16px] p-6 w-full max-w-sm space-y-4">
            {/* Header */}
            <div>
              <p className="text-[10px] text-[#FF5E14] font-semibold uppercase tracking-[0.08em] mb-1">
                Registrar pago presencial
              </p>
              <p className="text-[12px] text-[#666]">
                El pago se registra como aprobado directamente.
              </p>
            </div>

            {/* Selector de plan */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-[#555] uppercase tracking-[0.07em]">Plan</p>
              <div className="space-y-1">
                {plans.map((plan) => {
                  const isSelected = plan.id === selectedPlanId;
                  return (
                    <button
                      key={plan.id}
                      onClick={() => handlePlanChange(plan.id)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors"
                      style={{
                        backgroundColor: isSelected ? "#FF5E1420" : "#0d0d0d",
                        border: `1px solid ${isSelected ? "#FF5E1440" : "#161616"}`,
                      }}
                    >
                      <span
                        className="text-[12px] font-medium"
                        style={{ color: isSelected ? "#FF5E14" : "#999" }}
                      >
                        {plan.name}
                      </span>
                      <span
                        className="text-[11px]"
                        style={{ color: isSelected ? "#FF5E14" : "#555" }}
                      >
                        {formatPrice(plan.price, plan.currency)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Método de pago */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-[#555] uppercase tracking-[0.07em]">Método</p>
              <div className="grid grid-cols-2 gap-1.5">
                {PAYMENT_METHODS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setMethod(value)}
                    className="px-3 py-2 rounded-lg text-[12px] font-medium transition-colors"
                    style={{
                      backgroundColor: method === value ? "#FF5E1420" : "#0d0d0d",
                      color: method === value ? "#FF5E14" : "#666",
                      border: `1px solid ${method === value ? "#FF5E1440" : "#161616"}`,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Monto — pre-llenado según plan, editable para ajustes */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-[#555] uppercase tracking-[0.07em]">
                Monto ({selectedPlan?.currency ?? "CRC"})
              </p>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#161616] rounded-lg px-3 py-2.5 text-[13px] text-[#ccc] outline-none focus:border-[#FF5E14]"
              />
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-[#555] uppercase tracking-[0.07em]">
                Notas (opcional)
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full bg-[#0d0d0d] border border-[#161616] rounded-lg px-3 py-2.5 text-[13px] text-[#ccc] outline-none focus:border-[#FF5E14] resize-none"
                placeholder="Ej: Pago de enero, efectivo en recepción"
              />
            </div>

            {error && <p className="text-[11px] text-red-400">{error}</p>}

            {/* Botones */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-lg text-[12px] font-medium bg-[#0d0d0d] text-[#666] border border-[#161616]"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending || !selectedPlan}
                className="flex-1 py-2.5 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: "#FF5E14", color: "white" }}
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Registrando...
                  </span>
                ) : (
                  "Confirmar pago"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
