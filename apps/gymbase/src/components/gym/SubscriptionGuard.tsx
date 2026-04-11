// SubscriptionGuard.tsx — Redirige al miembro a /portal/membership si su suscripción no está activa
// Se monta en el layout del portal; usa pathname para no redirigir si ya está en la pantalla de membresía.

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

interface SubscriptionGuardProps {
  isActive: boolean;
}

// Rutas del portal que no requieren membresía activa
const OPEN_ROUTES = ["/portal/membership", "/portal/plans"];

export function SubscriptionGuard({ isActive }: SubscriptionGuardProps): null {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isActive) return;

    // Si la ruta actual ya es una ruta abierta, no redirigir
    const isOpenRoute = OPEN_ROUTES.some((r) => pathname.startsWith(r));
    if (!isOpenRoute) {
      router.replace("/portal/membership");
    }
  }, [isActive, pathname, router]);

  return null;
}
