// page.tsx — Gestión de planes de membresía (CRUD)

import { PlansClient } from "@/app/(dashboard)/admin/plans/PlansClient";
import { getPlans } from "@/actions/membership.actions";

export default async function PlansPage(): Promise<React.ReactNode> {
  const plans = await getPlans();
  return <PlansClient initialPlans={plans} />;
}
