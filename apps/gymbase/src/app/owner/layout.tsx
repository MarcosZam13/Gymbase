// layout.tsx — Layout del portal owner con verificación de rol y sidebar independiente

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { OwnerSidebar } from "@/components/owner/OwnerSidebar";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  if (user.role !== "owner") {
    redirect(user.role === "admin" ? "/admin" : "/portal/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <OwnerSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
