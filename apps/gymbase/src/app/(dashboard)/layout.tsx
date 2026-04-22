// layout.tsx — Layout del panel de administración: sidebar fijo + área de contenido oscura

import { GymAdminSidebar } from "@/components/gym/GymAdminSidebar";
import { getLowStockCount } from "@/actions/inventory.actions";
import { themeConfig } from "@/lib/theme";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactNode> {
  // Precarga el conteo de stock bajo para el badge del sidebar — solo si el módulo está activo
  const inventoryBadgeCount = themeConfig.features.gym_inventory
    ? await getLowStockCount()
    : 0;

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--gym-bg-base)" }}>
      <GymAdminSidebar inventoryBadgeCount={inventoryBadgeCount} />
      {/* El área de contenido no tiene max-width propio — cada página lo maneja */}
      <main className="flex-1 overflow-auto" style={{ backgroundColor: "var(--gym-bg-base)" }}>
        {children}
      </main>
    </div>
  );
}
