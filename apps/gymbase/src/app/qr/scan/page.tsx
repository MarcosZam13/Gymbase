// page.tsx — Página full-screen del escáner QR (solo admin/trainer)

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { QRScanner } from "@/components/gym/checkin/QRScanner";

export default async function QRScanPage(): Promise<React.ReactNode> {
  const user = await getCurrentUser();

  // Solo admin/trainer puede acceder al escáner
  if (!user || !["admin", "trainer"].includes(user.role)) {
    redirect("/login");
  }

  return <QRScanner />;
}
