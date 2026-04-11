// ManualPaymentDialog.tsx — Dialog para registrar un pago presencial desde /admin/payments
// Flujo "frío": el admin busca al miembro, elige plan, método y monto sin necesitar una suscripción preexistente.

"use client";

import { useState, useTransition, useDeferredValue } from "react";
import { PlusCircle, Search, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { registerManualPayment } from "@/actions/payment.actions";
import { formatPrice } from "@/lib/utils";
import type { MembershipPlan } from "@/types/database";

interface Member {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface ManualPaymentDialogProps {
  members: Member[];
  plans: MembershipPlan[];
}

const PAYMENT_METHODS = [
  { value: "efectivo",      label: "Efectivo" },
  { value: "tarjeta",       label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

export function ManualPaymentDialog({ members, plans }: ManualPaymentDialogProps): React.ReactNode {
  const [open, setOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id ?? "");
  const [method, setMethod] = useState<PaymentMethod>("efectivo");
  const [amount, setAmount] = useState(plans[0]?.price.toString() ?? "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const deferredSearch = useDeferredValue(memberSearch);

  const filteredMembers = deferredSearch.trim()
    ? members.filter(
        (m) =>
          m.full_name?.toLowerCase().includes(deferredSearch.toLowerCase()) ||
          m.email?.toLowerCase().includes(deferredSearch.toLowerCase())
      )
    : members.slice(0, 8); // Mostrar los primeros 8 cuando no hay búsqueda activa

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find((p) => p.id === planId);
    if (plan) setAmount(plan.price.toString());
  };

  const handleOpen = () => {
    setMemberSearch("");
    setSelectedMember(null);
    setSelectedPlanId(plans[0]?.id ?? "");
    setAmount(plans[0]?.price.toString() ?? "");
    setMethod("efectivo");
    setNotes("");
    setError(null);
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!selectedMember) {
      setError("Debes seleccionar un miembro");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("El monto debe ser mayor a 0");
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await registerManualPayment({
        userId: selectedMember.id,
        planId: selectedPlanId,
        paymentMethod: method,
        amount: parsedAmount,
        notes: notes || undefined,
      });

      if (result.success) {
        toast.success(`Pago registrado para ${selectedMember.full_name ?? selectedMember.email}`);
        setOpen(false);
      } else {
        setError(typeof result.error === "string" ? result.error : "Error al registrar el pago");
      }
    });
  };

  return (
    <>
      {/* Botón trigger */}
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 h-[34px] px-3 rounded-lg text-[12px] font-medium transition-colors"
        style={{
          backgroundColor: "rgba(255,94,20,0.12)",
          color: "#FF5E14",
          border: "1px solid rgba(255,94,20,0.3)",
        }}
      >
        <PlusCircle className="w-3.5 h-3.5" />
        Registrar pago presencial
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="bg-[#111] border border-[#1a1a1a] rounded-[18px] w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a] sticky top-0 bg-[#111] rounded-t-[18px]">
              <div>
                <p className="text-[13px] font-semibold text-white">Registrar pago presencial</p>
                <p className="text-[11px] text-[#555] mt-0.5">Se aprueba directamente — sin comprobante digital</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[#444] hover:text-[#888] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Selector de miembro */}
              <div className="space-y-2">
                <p className="text-[10px] text-[#555] uppercase tracking-[0.07em] font-semibold">Miembro</p>

                {selectedMember ? (
                  // Miembro seleccionado — mostrar con opción de cambiar
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[rgba(255,94,20,0.08)] border border-[rgba(255,94,20,0.2)]">
                    <div>
                      <p className="text-[13px] font-medium text-[#FF5E14]">{selectedMember.full_name ?? "—"}</p>
                      <p className="text-[10px] text-[#FF5E14]/60 mt-0.5">{selectedMember.email}</p>
                    </div>
                    <button
                      onClick={() => { setSelectedMember(null); setMemberSearch(""); }}
                      className="text-[10px] text-[#555] hover:text-[#888] transition-colors px-2 py-1 rounded"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  // Buscador de miembros
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0d0d0d] border border-[#1a1a1a] focus-within:border-[#333]">
                      <Search className="w-3.5 h-3.5 text-[#444] shrink-0" />
                      <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        className="bg-transparent text-[12px] text-[#ccc] placeholder-[#444] outline-none w-full"
                        autoFocus
                      />
                    </div>
                    {/* Lista de resultados */}
                    <div className="max-h-36 overflow-y-auto rounded-lg border border-[#1a1a1a] divide-y divide-[#111]">
                      {filteredMembers.length === 0 ? (
                        <p className="text-[11px] text-[#444] text-center py-4">Sin resultados</p>
                      ) : (
                        filteredMembers.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => { setSelectedMember(m); setMemberSearch(""); }}
                            className="w-full flex flex-col items-start px-3 py-2 bg-[#0d0d0d] hover:bg-[#141414] transition-colors text-left"
                          >
                            <span className="text-[12px] text-[#ccc]">{m.full_name ?? "—"}</span>
                            <span className="text-[10px] text-[#555]">{m.email}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Selector de plan */}
              <div className="space-y-2">
                <p className="text-[10px] text-[#555] uppercase tracking-[0.07em] font-semibold">Plan</p>
                <div className="space-y-1">
                  {plans.map((plan) => {
                    const isSelected = plan.id === selectedPlanId;
                    return (
                      <button
                        key={plan.id}
                        onClick={() => handlePlanChange(plan.id)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors"
                        style={{
                          backgroundColor: isSelected ? "rgba(255,94,20,0.1)" : "#0d0d0d",
                          border: `1px solid ${isSelected ? "rgba(255,94,20,0.3)" : "#161616"}`,
                        }}
                      >
                        <span className="text-[12px] font-medium" style={{ color: isSelected ? "#FF5E14" : "#888" }}>
                          {plan.name}
                        </span>
                        <span className="text-[11px]" style={{ color: isSelected ? "#FF5E14" : "#444" }}>
                          {formatPrice(plan.price, plan.currency)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Método de pago */}
              <div className="space-y-2">
                <p className="text-[10px] text-[#555] uppercase tracking-[0.07em] font-semibold">Método</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {PAYMENT_METHODS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setMethod(value)}
                      className="px-3 py-2 rounded-lg text-[12px] font-medium transition-colors"
                      style={{
                        backgroundColor: method === value ? "rgba(255,94,20,0.1)" : "#0d0d0d",
                        color: method === value ? "#FF5E14" : "#666",
                        border: `1px solid ${method === value ? "rgba(255,94,20,0.3)" : "#161616"}`,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Monto */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-[#555] uppercase tracking-[0.07em] font-semibold">
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
                <p className="text-[10px] text-[#555] uppercase tracking-[0.07em] font-semibold">
                  Notas (opcional)
                </p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-[#0d0d0d] border border-[#161616] rounded-lg px-3 py-2.5 text-[12px] text-[#ccc] placeholder-[#444] outline-none focus:border-[#FF5E14] resize-none"
                  placeholder="Ej: Pago de abril, efectivo en recepción"
                />
              </div>

              {error && (
                <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              {/* Botones */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 rounded-lg text-[12px] font-medium bg-[#0d0d0d] text-[#666] border border-[#161616] hover:text-[#888] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isPending || !selectedMember || !selectedPlanId}
                  className="flex-1 py-2.5 rounded-lg text-[12px] font-semibold transition-colors disabled:opacity-50"
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
        </div>
      )}
    </>
  );
}
