// layout.tsx — Layout del panel de administración: sidebar fijo + área de contenido oscura

import { GymAdminSidebar } from "@/components/gym/GymAdminSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--gym-bg-base)" }}>
      <GymAdminSidebar />
      {/* El área de contenido no tiene max-width propio — cada página lo maneja */}
      <main className="flex-1 overflow-auto" style={{ backgroundColor: "var(--gym-bg-base)" }}>
        {children}
      </main>
    </div>
  );
}
