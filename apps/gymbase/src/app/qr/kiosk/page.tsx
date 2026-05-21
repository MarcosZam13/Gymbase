// page.tsx — Kiosk de entrada del gym: cámara activa + ocupación + confirmación (solo admin/owner)

import { redirect } from "next/navigation";
import { getCurrentUser, getOrgId } from "@/lib/supabase/server";
import { KioskScanner } from "@/components/gym/checkin/KioskScanner";
import { themeConfig } from "@/lib/theme";

export default async function KioskPage(): Promise<React.ReactNode> {
  if (!themeConfig.features.gym_qr_checkin) redirect("/admin");

  const user = await getCurrentUser();
  if (!user || !["admin", "owner", "trainer"].includes(user.role)) {
    redirect("/login");
  }

  const orgId = await getOrgId();

  return (
    <KioskScanner
      orgId={orgId}
      gymName={themeConfig.brand.name}
    />
  );
}
