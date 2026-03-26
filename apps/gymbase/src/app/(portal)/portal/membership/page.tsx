// page.tsx — Estado de la membresía y subida de comprobante de pago

import { MembershipClient } from "@core/app/(portal)/portal/membership/MembershipClient";
import { getCurrentUser } from "@/lib/supabase/server";
import { getUserSubscription } from "@core/actions/payment.actions";

export default async function MembershipPage(): Promise<React.ReactNode> {
  const [profile, subscription] = await Promise.all([
    getCurrentUser(),
    getUserSubscription(),
  ]);

  return <MembershipClient profile={profile} subscription={subscription} />;
}
