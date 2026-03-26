// page.tsx — Gestión de planes de membresía (CRUD)

import { PlansClient } from "@core/app/(dashboard)/admin/plans/PlansClient";
import { getPlans } from "@core/actions/membership.actions";

export default async function PlansPage(): Promise<React.ReactNode> {
  const plans = await getPlans();
  return <PlansClient initialPlans={plans} />;
}
