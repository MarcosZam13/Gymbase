// layout.tsx — Layout del portal del cliente: top navbar + área de contenido + bottom nav mobile

import { GymPortalNav } from "@/components/gym/GymPortalNav";
import { GymPortalBottomNav } from "@/components/gym/GymPortalBottomNav";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactNode> {
  const profile = await getCurrentUser();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--gym-bg-base)" }}>
      {/* Navbar fijo en la parte superior */}
      <GymPortalNav profile={profile} />

      {/* Contenido principal — en mobile agrega padding inferior para el bottom nav */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8 pt-24 pb-20 md:pb-8">
        {children}
      </main>

      {/* Bottom navigation — solo visible en mobile (<768px) */}
      <GymPortalBottomNav profile={profile} />
    </div>
  );
}
