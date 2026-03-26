// page.tsx — Vista de planes disponibles para el cliente con flujo de suscripción

import { PlansPortalClient } from "@core/app/(portal)/portal/plans/PlansPortalClient";
import { getPlans } from "@core/actions/membership.actions";
import { getUserSubscription } from "@core/actions/payment.actions";

export default async function PortalPlansPage(): Promise<React.ReactNode> {
  const [plans, currentSubscription] = await Promise.all([
    getPlans(true),
    getUserSubscription(),
  ]);

  return (
    <PlansPortalClient
      plans={plans}
      currentSubscription={currentSubscription}
    />
  );
}
