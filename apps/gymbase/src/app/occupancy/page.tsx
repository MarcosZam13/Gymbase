// page.tsx — Panel público de ocupación para kiosco/TV (sin auth)

import { OccupancyKiosk } from "@/components/gym/checkin/OccupancyKiosk";
import { themeConfig } from "@/lib/theme";
import { getOrgId } from "@/lib/supabase/server";

export default async function OccupancyPublicPage(): Promise<React.ReactNode> {
  let orgId: string;

  try {
    orgId = await getOrgId();
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <p>No se pudo cargar la información de ocupación.</p>
      </div>
    );
  }

  return (
    <OccupancyKiosk
      orgId={orgId}
      gymName={themeConfig.brand.name}
    />
  );
}
