// page.tsx — Revisión de comprobantes de pago pendientes

import { PaymentsClient } from "@core/app/(dashboard)/admin/payments/PaymentsClient";
import { getPendingPayments } from "@core/actions/payment.actions";

export default async function PaymentsPage(): Promise<React.ReactNode> {
  const payments = await getPendingPayments();
  return <PaymentsClient initialPayments={payments} />;
}
