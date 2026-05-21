// page.tsx — QR del miembro a pantalla completa para mostrar en la entrada del gym

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getMyQR, getMyOpenCheckin } from "@/actions/checkin.actions";
import { QRFullScreen } from "@/components/gym/checkin/QRFullScreen";
import { themeConfig } from "@/lib/theme";

export default async function QRShowPage(): Promise<React.ReactNode> {
  if (!themeConfig.features.gym_qr_checkin) redirect("/portal/profile");

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [qrData, openCheckin] = await Promise.all([
    getMyQR(),
    getMyOpenCheckin(),
  ]);

  if (!qrData) redirect("/portal/profile");

  return (
    <QRFullScreen
      qrData={qrData}
      memberName={user.full_name ?? null}
      openCheckin={openCheckin}
    />
  );
}
