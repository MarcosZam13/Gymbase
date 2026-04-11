// page.tsx — Gestión de pagos con tema oscuro consistente con el panel admin de GymBase

import { getAllPaymentsAdmin } from "@/actions/payment.actions";
import { getPlans } from "@core/actions/membership.actions";
import { getMembers } from "@core/actions/admin.actions";
import { GymPaymentsClient } from "@/components/gym/payments/GymPaymentsClient";
import { ManualPaymentDialog } from "@/components/gym/payments/ManualPaymentDialog";

export default async function PaymentsPage(): Promise<React.ReactNode> {
  // Cargar pagos, planes y miembros en paralelo — los planes y miembros son para el dialog de pago manual
  const [payments, plans, members] = await Promise.all([
    getAllPaymentsAdmin(),
    getPlans(true),
    getMembers(),
  ]);

  // Extraer solo los campos necesarios para el buscador de miembros
  const memberList = members.map((m) => ({
    id: m.id,
    full_name: m.full_name,
    email: m.email,
  }));

  return (
    <div className="p-6 space-y-0">
      <GymPaymentsClient
        initialPayments={payments}
        manualPaymentSlot={
          <ManualPaymentDialog members={memberList} plans={plans} />
        }
      />
    </div>
  );
}
