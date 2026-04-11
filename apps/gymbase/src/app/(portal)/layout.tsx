// layout.tsx — Layout del portal del cliente: top navbar + área de contenido + bottom nav mobile

import { GymPortalNav } from "@/components/gym/GymPortalNav";
import { GymPortalBottomNav } from "@/components/gym/GymPortalBottomNav";
import { SubscriptionGuard } from "@/components/gym/SubscriptionGuard";
import { getCurrentUser } from "@/lib/supabase/server";
import { getUserSubscription } from "@core/actions/payment.actions";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactNode> {
  const [profile, subscription] = await Promise.all([
    getCurrentUser(),
    getUserSubscription(),
  ]);

  // Una membresía es activa si su estado es "active" Y aún no ha vencido
  const isActive =
    subscription?.status === "active" &&
    !!subscription?.expires_at &&
    new Date(subscription.expires_at) > new Date();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--gym-bg-base)" }}>
      {/* Guard client-side: redirige a /portal/membership si la membresía no está activa */}
      <SubscriptionGuard isActive={isActive} />

      {/* Navbar fijo en la parte superior — filtra links según estado de membresía */}
      <GymPortalNav profile={profile} isActive={isActive} />

      {/* Contenido principal — en mobile agrega padding inferior para el bottom nav */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8 pt-24 pb-20 md:pb-8">
        {children}
      </main>

      {/* Bottom navigation — solo visible en mobile (<768px) */}
      <GymPortalBottomNav profile={profile} isActive={isActive} />
    </div>
  );
}
